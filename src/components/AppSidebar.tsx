
import { useState, useEffect } from 'react';
import { Plus, Settings, LogOut, User, Award, PanelLeftClose, PanelLeft, ShieldCheck, Trash2 } from 'lucide-react';

import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useDiploma } from '@/contexts/DiplomaContext';
import { useAdminRole } from '@/hooks/useAdminRole';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SettingsContent } from './Settings';

interface DiplomaSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface AppSidebarProps {
  userEmail?: string;
  userName?: string;
}

function groupByDate(sessions: DiplomaSession[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const week = new Date(today.getTime() - 7 * 86400000);

  const groups: { label: string; items: DiplomaSession[] }[] = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'Previous 7 days', items: [] },
    { label: 'Older', items: [] },
  ];

  for (const s of sessions) {
    const d = new Date(s.updated_at);
    if (d >= today) groups[0].items.push(s);
    else if (d >= yesterday) groups[1].items.push(s);
    else if (d >= week) groups[2].items.push(s);
    else groups[3].items.push(s);
  }

  return groups.filter(g => g.items.length > 0);
}

export function AppSidebar({ userEmail, userName }: AppSidebarProps) {
  const navigate = useNavigate();
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === 'collapsed';
  const { currentSessionId, loadSession, resetSession } = useDiploma();
  const [sessions, setSessions] = useState<DiplomaSession[]>([]);
  const [profileName, setProfileName] = useState(userName || '');
  const [deleteTarget, setDeleteTarget] = useState<DiplomaSession | null>(null);
  const { isAdmin } = useAdminRole();

  // Refresh sessions when currentSessionId changes (new session created or switched)
  useEffect(() => {
    fetchSessions();
    if (userEmail) fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSessionId, userEmail]);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single();
      if (data?.name) setProfileName(data.name);
    } catch (error) {
      console.error('Failed to fetch profile name:', error);
    }
  };

  const fetchSessions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('diploma_sessions')
      .select('id, title, created_at, updated_at')
      .order('updated_at', { ascending: false });
    if (data) setSessions(data);
  };

  const handleNewDiploma = () => {
    resetSession();
  };

  const handleSelectSession = (id: string) => {
    loadSession(id);
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) toast.error('Error signing out');
    else {
      toast.success('Signed out successfully');
      navigate('/');
    }
  };

  const handleDeleteSession = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase
      .from('diploma_sessions')
      .delete()
      .eq('id', deleteTarget.id);
    if (error) {
      toast.error('Failed to delete session');
    } else {
      toast.success('Session deleted');
      if (currentSessionId === deleteTarget.id) resetSession();
      setSessions(prev => prev.filter(s => s.id !== deleteTarget.id));
    }
    setDeleteTarget(null);
  };

  const getInitials = (name: string) =>
    name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const grouped = groupByDate(sessions);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center justify-between">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="certera.ink" className="pointer-events-none">
                <div className="bg-primary/15 border border-primary/20 p-1 rounded-md">
                  <Award className="h-4 w-4 text-primary" />
                </div>
                {!collapsed && <span className="font-semibold text-foreground tracking-tight">certera.ink</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => toggleSidebar()}
          >
            {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleNewDiploma} tooltip="New Diploma">
              <Plus className="h-4 w-4" />
              {!collapsed && <span>New Diploma</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {!collapsed && (
          <ScrollArea className="flex-1">
            {grouped.map(group => (
              <SidebarGroup key={group.label}>
                <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map(session => (
                      <SidebarMenuItem key={session.id} className="group/session">
                        <SidebarMenuButton
                          onClick={() => handleSelectSession(session.id)}
                          isActive={session.id === currentSessionId}
                          tooltip={session.title}
                        >
                          <span className="truncate flex-1 pr-6">{session.title}</span>
                        </SidebarMenuButton>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget(session); }}
                          className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/session:opacity-100 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-opacity"
                          aria-label={`Delete ${session.title}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </ScrollArea>
        )}
      </SidebarContent>

      {userEmail && (
        <SidebarFooter>
          <SidebarMenu>
            {isAdmin && (
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => navigate('/admin')} tooltip="Admin Dashboard">
                  <ShieldCheck className="h-4 w-4" />
                  {!collapsed && <span>Admin</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => navigate('/signed')} tooltip="Signed Diplomas">
                <Award className="h-4 w-4" />
                {!collapsed && <span>Signed Diplomas</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton tooltip={profileName || userEmail}>
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {getInitials(profileName || userName || 'U')}
                      </AvatarFallback>
                    </Avatar>
                    {!collapsed && (
                      <span className="truncate text-sm">{profileName || userName}</span>
                    )}
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="start" className="w-56">
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <Dialog>
                    <DialogTrigger asChild>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </DropdownMenuItem>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Settings</DialogTitle>
                        <DialogDescription>
                          Configure your application preferences and API settings
                        </DialogDescription>
                      </DialogHeader>
                      <SettingsContent />
                    </DialogContent>
                  </Dialog>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      )}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete session?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteTarget?.title}". Signed diplomas are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSession} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sidebar>
  );
}
