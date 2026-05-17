import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface GuestBannerProps {
  remainingGenerations: number;
  maxGenerations: number;
}

export const GuestBanner = ({ remainingGenerations, maxGenerations }: GuestBannerProps) => {
  const navigate = useNavigate();

  return (
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-sm">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4" />
        <span>Guest Mode</span>
        <Badge variant="secondary" className="text-xs">
          {remainingGenerations}/{maxGenerations} generations left
        </Badge>
      </div>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => navigate('/auth')}
        className="h-7 text-xs"
      >
        Create account for unlimited access
      </Button>
    </div>
  );
};
