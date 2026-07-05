import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAdminRole } from '@/hooks/useAdminRole';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, Users, FileText, Home, Loader2, Settings, Layers, Palette } from 'lucide-react';
import AdminIntegrations from '@/components/AdminIntegrations';
import AdminBranding from '@/components/AdminBranding';
import { toast } from 'sonner';

interface DiplomaRow {
  id: string;
  blockchain_id: string;
  recipient_name: string;
  institution_name: string;
  issuer_id: string;
  created_at: string;
}

interface UserRow {
  id: string;
  name: string | null;
  email: string | null;
  created_at: string;
}

interface RoleRow {
  user_id: string;
  role: string;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: roleLoading } = useAdminRole();
  const [diplomas, setDiplomas] = useState<DiplomaRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      navigate('/app');
    }
  }, [roleLoading, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) fetchAll();
  }, [isAdmin]);

  const fetchAll = async () => {
    setLoading(true);
    const [diplomaRes, userRes, roleRes] = await Promise.all([
      supabase.from('signed_diplomas').select('id, blockchain_id, recipient_name, institution_name, issuer_id, created_at').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, name, email, created_at').order('created_at', { ascending: false }),
      supabase.from('user_roles').select('user_id, role'),
    ]);
    if (diplomaRes.data) setDiplomas(diplomaRes.data);
    if (userRes.data) setUsers(userRes.data);
    if (roleRes.data) setRoles(roleRes.data);
    setLoading(false);
  };

  const getUserRoles = (userId: string) => roles.filter(r => r.user_id === userId).map(r => r.role);

  const toggleAdminRole = async (userId: string) => {
    const currentRoles = getUserRoles(userId);
    const hasAdmin = currentRoles.includes('admin');

    if (hasAdmin) {
      // Guard against accidental self-lockout
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id === userId && !window.confirm('You are about to remove your own admin role and will lose access to this dashboard. Continue?')) {
        return;
      }
      const { error } = await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', 'admin');
      if (error) {
        toast.error('Failed to remove admin role');
        return;
      }
      toast.success('Admin role removed');
    } else {
      const { error } = await supabase.from('user_roles').insert({ user_id: userId, role: 'admin' });
      if (error) {
        toast.error('Failed to add admin role');
        return;
      }
      toast.success('Admin role added');
    }
    fetchAll();
  };

  if (roleLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/admin/dsl')}>
              <Layers className="h-4 w-4 mr-2" />
              DSL Block Explorer
            </Button>
            <Button variant="outline" onClick={() => navigate('/app')}>
              <Home className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Total Diplomas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">{diplomas.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Registered Users</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">{users.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Admins</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">{roles.filter(r => r.role === 'admin').length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="diplomas">
          <TabsList>
            <TabsTrigger value="diplomas" className="gap-2">
              <FileText className="h-4 w-4" /> Diplomas
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" /> Users & Roles
            </TabsTrigger>
            <TabsTrigger value="branding" className="gap-2">
              <Palette className="h-4 w-4" /> Branding & OG
            </TabsTrigger>
            <TabsTrigger value="integrations" className="gap-2">
              <Settings className="h-4 w-4" /> Integrations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="diplomas">
            <Card>
              <CardHeader>
                <CardTitle>All Signed Diplomas</CardTitle>
              </CardHeader>
              <CardContent>
                {diplomas.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No diplomas yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Recipient</TableHead>
                          <TableHead>Institution</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {diplomas.map(d => (
                          <TableRow key={d.id}>
                            <TableCell className="font-mono text-xs max-w-[120px] truncate">{d.blockchain_id}</TableCell>
                            <TableCell>{d.recipient_name}</TableCell>
                            <TableCell>{d.institution_name}</TableCell>
                            <TableCell>{new Date(d.created_at).toLocaleDateString('en-US')}</TableCell>
                            <TableCell>
                              <Button size="sm" variant="outline" onClick={() => navigate(`/diploma/${d.blockchain_id}`)}>
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>Users & Roles</CardTitle>
              </CardHeader>
              <CardContent>
                {users.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No users yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Roles</TableHead>
                          <TableHead>Registered</TableHead>
                          <TableHead>Admin</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map(u => {
                          const userRoles = getUserRoles(u.id);
                          const hasAdmin = userRoles.includes('admin');
                          return (
                            <TableRow key={u.id}>
                              <TableCell>{u.name || '—'}</TableCell>
                              <TableCell>{u.email || '—'}</TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  {userRoles.map(r => (
                                    <Badge key={r} variant={r === 'admin' ? 'default' : 'secondary'}>{r}</Badge>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell>{new Date(u.created_at).toLocaleDateString('en-US')}</TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  variant={hasAdmin ? 'destructive' : 'outline'}
                                  onClick={() => toggleAdminRole(u.id)}
                                >
                                  {hasAdmin ? 'Remove admin' : 'Make admin'}
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="branding">
            <AdminBranding />
          </TabsContent>

          <TabsContent value="integrations">
            <AdminIntegrations />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
