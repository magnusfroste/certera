import { useState } from 'react';
import { ArrowRight, Building2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RecipeGallery } from '@/components/RecipeGallery';
import { useGeneration } from '@/hooks/useGeneration';
import { useDiploma } from '@/contexts/DiplomaContext';
import { organizationRecipe, onboardingStep } from '@/lib/onboarding';

interface Props {
  organization: string;
  onSave: (name: string) => void;
  onSkip: () => void;
}

export function FirstCertificateGuide({ organization, onSave, onSkip }: Props) {
  const [name, setName] = useState(organization);
  const { applyRecipe, isGenerating } = useGeneration();
  const { setSigningInstitutionName } = useDiploma();
  const step = onboardingStep(organization, false);
  return (
    <section aria-label="First certificate setup" className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-8 sm:py-12">
      <div className="flex items-center justify-between gap-3 mb-6">
        <p className="text-xs font-mono text-muted-foreground">GET STARTED</p>
        <Button variant="ghost" size="sm" onClick={onSkip}>Skip for now</Button>
      </div>
      <h1 className="text-2xl sm:text-3xl font-semibold">Your first certificate</h1>
      <p className="text-sm text-muted-foreground mt-2">Set up your issuer, choose a design, then make it official.</p>
      <ol className="grid grid-cols-3 gap-3 my-8 text-xs sm:text-sm" aria-label="Setup progress">
        {['Create organization', 'Choose template', 'Issue certificate'].map((label, index) => (
          <li key={label} aria-current={step === index + 1 ? 'step' : undefined} className={`border-t-2 pt-3 ${step === index + 1 ? 'border-primary text-foreground' : 'border-border text-muted-foreground'}`}>
            <span className="block font-mono mb-2">{step > index + 1 ? <CheckCircle2 className="size-4 text-success" /> : `0${index + 1}`}</span>{label}
          </li>
        ))}
      </ol>
      {step === 1 ? (
        <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); if (name.trim()) onSave(name); }}>
          <div><Building2 className="size-6 text-primary mb-3" /><h2 className="text-lg font-medium">Create your organization</h2><p className="text-sm text-muted-foreground mt-2">No organization set up yet. Start with the name that should appear on your certificates.</p></div>
          <div className="space-y-2"><Label htmlFor="organization-name">Organization name</Label><Input id="organization-name" autoComplete="organization" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your academy, team or business" required maxLength={120} /><p className="text-xs text-muted-foreground">Saved in this browser for your account. This does not verify your organization’s identity.</p></div>
          <Button type="submit" disabled={!name.trim()}>Continue to templates <ArrowRight className="ml-2 size-4" /></Button>
        </form>
      ) : (
        <div className="space-y-5">
          <div><h2 className="text-lg font-medium">Choose your first template</h2><p className="text-sm text-muted-foreground mt-2">No design yet. Select a template for {organization}; you can refine it before issuing.</p><Button variant="ghost" size="sm" className="mt-2 px-0" onClick={() => onSave('')}>Change organization</Button></div>
          <RecipeGallery disabled={isGenerating} onPick={(recipe) => { setSigningInstitutionName(organization); void applyRecipe(organizationRecipe(recipe, organization)); }} />
        </div>
      )}
    </section>
  );
}