import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DiplomaManager } from '@/components/DiplomaManager';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { DiplomaProvider } from '@/contexts/DiplomaContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

const SignedContent = ({ user }: { user: User }) => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen w-full">
      <AppSidebar
        userEmail={user.email || ''}
        userName={user.user_metadata?.name || user.email?.split('@')[0] || 'User'}
      />
      <main className="flex-1 bg-background p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-primary/15 border border-primary/20 p-2 rounded-lg">
                <Award className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-foreground">Signed Diplomas</h1>
                <p className="text-sm text-muted-foreground">Manage your blockchain-verified credentials</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-lg shadow-sm border p-6">
            <DiplomaManager />
          </div>
        </div>
      </main>
    </div>
  );
};

const Signed = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (!session) navigate('/auth');
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session) navigate('/auth');
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading || !user) return null;

  return (
    <ThemeProvider>
      <DiplomaProvider>
        <SidebarProvider>
          <SignedContent user={user} />
        </SidebarProvider>
      </DiplomaProvider>
    </ThemeProvider>
  );
};

export default Signed;
