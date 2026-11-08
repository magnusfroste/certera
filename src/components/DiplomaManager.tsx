
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import {
  ExternalLink, Copy, User, Building2, FileText, Search,
  ShieldCheck, ChevronDown, ArrowUpDown, Award, Clock,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

interface SignedDiploma {
  id: string;
  blockchain_id: string;
  recipient_name: string;
  institution_name: string;
  verification_url: string;
  diploma_url: string;
  created_at: string;
}

// --- Sub-components ---

const StatsBar = ({ diplomas }: { diplomas: SignedDiploma[] }) => {
  const stats = useMemo(() => {
    const institutions = new Set(diplomas.map((d) => d.institution_name));
    const latest = diplomas.length
      ? formatDistanceToNow(new Date(diplomas[0].created_at), { addSuffix: true })
      : null;
    return { total: diplomas.length, institutions: institutions.size, latest };
  }, [diplomas]);

  return (
    <div className="grid grid-cols-3 gap-4">
      {[
        { label: 'Total Diplomas', value: stats.total, icon: Award },
        { label: 'Institutions', value: stats.institutions, icon: Building2 },
        { label: 'Latest Signed', value: stats.latest ?? '—', icon: Clock },
      ].map((s) => (
        <Card key={s.label} className="p-4 flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <s.icon className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-lg font-semibold">{s.value}</p>
          </div>
        </Card>
      ))}
    </div>
  );
};

const EmptyState = () => {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="bg-primary/10 rounded-full p-6 mb-4">
        <Award className="w-12 h-12 text-primary" />
      </div>
      <h3 className="text-xl font-semibold mb-2">No signed diplomas yet</h3>
      <p className="text-muted-foreground mb-6 max-w-sm">
        Create and sign your first diploma to see it here.
      </p>
      <Button onClick={() => navigate('/app')}>Create Your First Diploma</Button>
    </div>
  );
};

const LoadingSkeleton = () => (
  <div className="space-y-4">
    <div className="grid grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-20 rounded-lg" />
      ))}
    </div>
    <Skeleton className="h-10 rounded-md" />
    {[1, 2, 3].map((i) => (
      <Skeleton key={i} className="h-24 rounded-lg" />
    ))}
  </div>
);

const DiplomaCard = ({ diploma }: { diploma: SignedDiploma }) => {
  const date = new Date(diploma.created_at).toLocaleDateString();

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${type} copied!`);
    } catch {
      toast.error(`Failed to copy ${type}`);
    }
  };

  return (
    <Card className="border-l-4 border-l-primary hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold">{diploma.recipient_name}</span>
            <ShieldCheck className="w-4 h-4 text-primary" />
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => window.open(diploma.diploma_url, '_blank')}>
              <FileText className="w-3 h-3 mr-1" /> View
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.open(diploma.verification_url, '_blank')}>
              <ExternalLink className="w-3 h-3 mr-1" /> Verify
            </Button>
            <Button size="sm" variant="ghost" onClick={() => copyToClipboard(diploma.verification_url, 'Link')}>
              <Copy className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Info row */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{diploma.institution_name}</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{date}</span>
        </div>

        {/* Collapsible details */}
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground px-0 hover:bg-transparent">
              <ChevronDown className="w-3 h-3 mr-1 transition-transform [[data-state=open]_&]:rotate-180" />
              Details
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-2">
            {[
              { label: 'Diploma ID', value: diploma.blockchain_id },
              { label: 'Diploma URL', value: diploma.diploma_url },
              { label: 'Verification URL', value: diploma.verification_url },
            ].map((item) => (
              <div key={item.label}>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{item.label}</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 text-xs bg-muted px-2 py-1 rounded font-mono truncate">{item.value}</code>
                  <Button size="sm" variant="outline" onClick={() => copyToClipboard(item.value, item.label)}>
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};

// --- Main component ---

export const DiplomaManager = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortAsc, setSortAsc] = useState(false);

  const { data: signedDiplomas, isLoading, error } = useQuery({
    queryKey: ['signed-diplomas'],
    queryFn: async () => {
      // "My diplomas": filter on the owner explicitly. Row-level security also
      // limits ordinary users to their own rows, but an admin may read every
      // row, and this list must never show other people's diplomas.
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from('signed_diplomas')
        .select('id, blockchain_id, recipient_name, institution_name, verification_url, diploma_url, created_at')
        .eq('issuer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SignedDiploma[];
    },
  });

  const filteredDiplomas = useMemo(() => {
    let list = signedDiplomas ?? [];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter((d) => d.recipient_name.toLowerCase().includes(term));
    }
    if (sortAsc) {
      list = [...list].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }
    return list;
  }, [signedDiplomas, searchTerm, sortAsc]);

  if (isLoading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-destructive">Failed to load signed diplomas</div>
      </div>
    );
  }

  if (!signedDiplomas || signedDiplomas.length === 0) return <EmptyState />;

  return (
    <div className="space-y-6">
      <StatsBar diplomas={signedDiplomas} />

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search by recipient name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => setSortAsc(!sortAsc)}>
          <ArrowUpDown className="w-4 h-4 mr-1" />
          {sortAsc ? 'Oldest' : 'Newest'}
        </Button>
      </div>

      {searchTerm && (
        <p className="text-sm text-muted-foreground">
          {filteredDiplomas.length} result{filteredDiplomas.length !== 1 ? 's' : ''}
        </p>
      )}

      {filteredDiplomas.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No diplomas match your search.</div>
      ) : (
        <div className="grid gap-3">
          {filteredDiplomas.map((d) => (
            <DiplomaCard key={d.id} diploma={d} />
          ))}
        </div>
      )}
    </div>
  );
};
