
import { useState, useEffect } from "react";
import { ChatPanel } from "@/components/ChatPanel";
import { ChatLanding } from "@/components/ChatLanding";
import { PreviewPanel } from "@/components/PreviewPanel";
import { DiplomaProvider, useDiploma } from "@/contexts/DiplomaContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { BlockchainMenu } from "@/components/BlockchainMenu";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { Award } from "lucide-react";
import { useGuestAccess } from "@/hooks/useGuestAccess";
import { GuestBanner } from "@/components/GuestBanner";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

const IndexContent = ({ user, isGuest, guestAccess }: {
  user: User | null;
  isGuest: boolean;
  guestAccess: ReturnType<typeof useGuestAccess>;
}) => {
  const { messages, diplomaHtml, isGenerating } = useDiploma();
  const hasStarted = messages.some(m => m.isUser);
  const hasCanvas = !!diplomaHtml;

  return (
    <div className="h-screen flex w-full">
      {!isGuest && (
        <AppSidebar
          userEmail={user?.email || ''}
          userName={user?.user_metadata?.name || user?.email?.split('@')[0] || 'User'}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {isGuest && <GuestBanner remainingGenerations={guestAccess.remainingGenerations} maxGenerations={guestAccess.maxGenerations} />}

        {/* Header - only for guests or when canvas is visible */}
        {(isGuest || hasCanvas) && (
          <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center justify-between px-4 py-2">
              <div className="flex items-center gap-2">
                {isGuest && (
                  <>
                    <div className="bg-primary/15 border border-primary/20 p-1.5 rounded-lg">
                      <Award className="w-5 h-5 text-primary" />
                    </div>
                    <h1 className="text-lg font-semibold tracking-tight text-foreground">certera.ink</h1>
                  </>
                )}
              </div>
              <div className="flex items-center gap-3">
                {!isGuest && hasCanvas && <BlockchainMenu />}
                {isGuest && (
                  <a href="/auth" className="text-sm font-medium text-primary hover:underline">
                    Create account →
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Main Content: 3 states */}
        <div className="flex-1 min-h-0">
          {!hasStarted ? (
            /* State 1: Landing - centered input */
            <div className="h-full animate-fade-in">
              <ChatLanding isGuest={isGuest} guestAccess={isGuest ? guestAccess : undefined} />
            </div>
          ) : !hasCanvas ? (
            /* State 2: Chat only - generating, no canvas yet */
            <div className="h-full max-w-3xl mx-auto animate-fade-in">
              <ChatPanel isGuest={isGuest} guestAccess={isGuest ? guestAccess : undefined} />
            </div>
          ) : (
            /* State 3: Split view - chat + canvas artifact */
            <ResizablePanelGroup direction="horizontal" className="w-full h-full">
              <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
                <div className="h-full border-r border-border bg-background">
                  <ChatPanel isGuest={isGuest} guestAccess={isGuest ? guestAccess : undefined} />
                </div>
              </ResizablePanel>
              <ResizableHandle withHandle className="bg-border hover:bg-primary/30 transition-colors data-[resize-handle-active]:bg-primary/50" />
              <ResizablePanel defaultSize={70} minSize={50} maxSize={80}>
                <div className="h-full bg-card/30 animate-canvas-reveal">
                  <PreviewPanel />
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          )}
        </div>
      </div>
    </div>
  );
};

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const isDemo = location.pathname === '/demo';
  const guestAccess = useGuestAccess();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (!session && !isDemo) navigate('/auth');
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (!session && !isDemo) navigate('/auth');
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate, isDemo]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user && !isDemo) return null;

  const isGuest = !user && isDemo;

  return (
    <ThemeProvider>
      <DiplomaProvider>
        <SidebarProvider>
          <IndexContent user={user} isGuest={isGuest} guestAccess={guestAccess} />
        </SidebarProvider>
      </DiplomaProvider>
    </ThemeProvider>
  );
};

export default Index;
