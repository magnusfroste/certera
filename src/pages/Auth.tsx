
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Award, Mail, Lock, ArrowLeft, User, MailCheck } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { oauthReturnPath } from '@/lib/oauth-return-path';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // "Create account" buttons link here with ?mode=signup.
  const initialTab = searchParams.get('mode') === 'signup' ? 'signup' : 'signin';
  const { toast } = useToast();
  const nextParam = searchParams.get('next');
  const returnTo = nextParam ? oauthReturnPath(nextParam) : '/app';
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  // After sign-up: the address the confirmation link went to. Shown in place of
  // the form, so the next step cannot be missed the way a toast can.
  const [sentTo, setSentTo] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate(returnTo);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session) navigate(returnTo);
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate, returnTo]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Back to where sign-up started: the studio by default, where a
          // design made as a guest is waiting (src/lib/guestDraft.ts), or the
          // ?next= page (e.g. the MCP consent screen). www.certera.ink/** is an
          // allowed redirect URL in Supabase Auth.
          emailRedirectTo: new URL(returnTo, window.location.origin).href,
          data: {
            name: name.trim() || email.split('@')[0],
          }
        }
      });

      if (error) throw error;

      setSentTo(email);
      toast({
        title: "Check your email",
        description: "We've sent you a confirmation link. Anything you designed in the demo will be waiting in your studio.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-primary/15 border border-primary/20 p-3 rounded-2xl">
              <Award className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-1">certera.ink</h1>
          <p className="text-sm text-muted-foreground">Create and verify digital diplomas</p>
          
          <div className="flex justify-center gap-2 mt-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              Home
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/demo')}>
              Try Free
            </Button>
          </div>
        </div>

        {/* Auth Card */}
        <div className="border border-border rounded-2xl bg-card p-6">
          {sentTo ? (
            <div className="text-center space-y-3 py-2" role="status">
              <MailCheck className="w-10 h-10 text-primary mx-auto" />
              <h2 className="text-lg font-semibold text-foreground">Check your inbox</h2>
              <p className="text-sm text-muted-foreground">
                We sent a confirmation link to <span className="text-foreground font-medium break-all">{sentTo}</span>.
                Click it to finish creating your account — anything you designed in the demo will be waiting in your studio.
              </p>
              <p className="text-xs text-muted-foreground">No email after a few minutes? Check your spam folder, or</p>
              <Button variant="outline" size="sm" onClick={() => setSentTo(null)}>Use a different email</Button>
            </div>
          ) : (
          <Tabs defaultValue={initialTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="signin-email" className="text-xs text-muted-foreground">
                    Email
                  </Label>
                  <Input
                    id="signin-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="signin-password" className="text-xs text-muted-foreground">
                    Password
                  </Label>
                  <Input
                    id="signin-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="signup-name" className="text-xs text-muted-foreground">
                    Full Name
                  </Label>
                  <Input
                    id="signup-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="signup-email" className="text-xs text-muted-foreground">
                    Email
                  </Label>
                  <Input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="signup-password" className="text-xs text-muted-foreground">
                    Password
                  </Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Creating account...' : 'Create Account'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
