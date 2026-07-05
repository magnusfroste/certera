import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface DiplomaGenerationRequest {
  messages: ChatMessage[];
  requestType?: 'text' | 'image' | 'url';
  imageData?: {
    type: string;
    data: string;
  };
  url?: string;
  currentHtml?: string;
  currentCss?: string;
  /** Structured design of the current diploma — enables DSL-native iteration */
  currentDsl?: Json;
  userFullName?: string;
  diplomaFormat?: 'portrait' | 'landscape';
}

export interface DiplomaGenerationResponse {
  message: string;
  html: string;
  css: string;
  /** Structured design when the server generated via the DSL (absent on legacy raw iteration) */
  dsl?: Json;
}

export const generateDiploma = async (request: DiplomaGenerationRequest): Promise<DiplomaGenerationResponse> => {
  try {
    // Get user's full name from profiles table
    let userFullName = request.userFullName;
    if (!userFullName) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Fetch name from profiles table
        const { data: profileData } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', user.id)
          .single();
        
        if (profileData?.name) {
          userFullName = profileData.name;
        } else {
          // Fallback to auth metadata if profile name doesn't exist
          if (user.user_metadata?.name) {
            userFullName = user.user_metadata.name;
          } else if (user.user_metadata?.full_name) {
            userFullName = user.user_metadata.full_name;
          } else {
            // Use email prefix as final fallback
            userFullName = user.email?.split('@')[0] || 'Your Name';
          }
        }
      } else {
        // Guest / demo: a friendly placeholder reads better than "User"
        userFullName = 'Your Name';
      }
    }

    const response = await supabase.functions.invoke('generate-diploma', {
      body: {
        ...request,
        userFullName,
        diplomaFormat: request.diplomaFormat || 'landscape'
      }
    });

    if (response.error) {
      // The edge function returns a friendly `message` in its body (e.g. the
      // guest daily limit). supabase-js hides it behind a generic error, so
      // read the response body to surface the real message to the user.
      const friendly = await extractFunctionErrorMessage(response.error);
      throw new Error(friendly || response.error.message);
    }

    return response.data;
  } catch (error) {
    console.error('Error calling generate-diploma function:', error);
    throw error;
  }
};

/** Pull the server-provided `message` out of a supabase FunctionsHttpError body. */
async function extractFunctionErrorMessage(error: unknown): Promise<string | null> {
  const context = (error as { context?: unknown })?.context;
  if (context instanceof Response) {
    try {
      const body = await context.clone().json();
      if (typeof body?.message === 'string') return body.message;
    } catch {
      // body wasn't JSON — fall through
    }
  }
  return null;
}

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve(dataUrl.slice(dataUrl.indexOf(',') + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

export const generateDiplomaFromImage = async (imageFile: File): Promise<DiplomaGenerationResponse> => {
  try {
    const imageData = {
      type: imageFile.type,
      data: await fileToBase64(imageFile),
    };

    return await generateDiploma({
      messages: [],
      requestType: 'image',
      imageData
    });
  } catch (error) {
    console.error('Error generating diploma from image:', error);
    throw error;
  }
};

export const generateDiplomaFromUrl = async (url: string): Promise<DiplomaGenerationResponse> => {
  try {
    return await generateDiploma({
      messages: [],
      requestType: 'url',
      url
    });
  } catch (error) {
    console.error('Error generating diploma from URL:', error);
    throw error;
  }
};
