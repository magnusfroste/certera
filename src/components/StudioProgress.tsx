import { Check, ChevronRight } from 'lucide-react';
import { useSignedDiploma } from '@/hooks/useSignedDiploma';

export function StudioProgress() {
  const signed = useSignedDiploma();
  return (
    <ol aria-label="Diploma progress" className="flex items-center gap-2 sm:gap-3 text-xs">
      {['Design', 'Sign', 'Share'].map((label, index) => (
        <li key={label} className="flex items-center gap-2">
          {index > 0 && <ChevronRight className="size-3 text-muted-foreground" />}
          <span aria-current={(signed ? index === 2 : index === 1) ? 'step' : undefined}
            className={`flex items-center gap-1.5 ${signed || index === 0 ? 'text-foreground' : index === 1 ? 'text-primary' : 'text-muted-foreground'}`}>
            {(index === 0 || (signed && index === 1)) ? <Check className="size-3 text-success" /> : <span className="font-mono">{index + 1}</span>}{label}
          </span>
        </li>
      ))}
    </ol>
  );
}