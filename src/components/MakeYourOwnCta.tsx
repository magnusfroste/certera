import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * "Make your own" on pages people reach through a shared diploma. Every
 * diploma that is handed out is seen by its recipient and whoever they share
 * it with; this turns that view into a way into the studio. ?ref= tags the
 * visit so get_traffic can show how many come this way.
 */
export const MakeYourOwnCta = ({ from }: { from: 'diploma' | 'verify' }) => (
  <aside className="mt-6 flex flex-col gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
    <div className="flex items-start gap-3">
      <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
      <div>
        <p className="font-semibold text-foreground">Issue verified diplomas like this one</p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Describe it and the AI designs it in seconds. Free to try — no account needed.
        </p>
      </div>
    </div>
    <Button asChild className="shrink-0">
      <Link to={`/demo?ref=${from}`}>
        Design your own <ArrowRight />
      </Link>
    </Button>
  </aside>
);
