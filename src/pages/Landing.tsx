import { Button } from "@/components/ui/button";
import { Award, ArrowRight, CheckCircle2, PenLine, ShieldCheck, Share2 } from "lucide-react";
import { Link } from "react-router-dom";
import { DiplomaFrame } from "@/components/DiplomaFrame";
import { DIPLOMA_RECIPES } from "@/constants/diplomaRecipes";
import { renderDSL } from "@/diploma-dsl/render";

const recipe = DIPLOMA_RECIPES.find((item) => item.id === 'classic-university');
const sample = recipe ? renderDSL(recipe.dsl) : null;
const steps = [
  { icon: PenLine, title: 'Design', description: 'Start with a template. Make it your own.' },
  { icon: ShieldCheck, title: 'Sign on Hedera', description: 'A permanent record of your diploma’s authenticity.' },
  { icon: Share2, title: 'Share & verify', description: 'One link. Anyone can check it. No account needed.' },
];

const Landing = () => (
  <div className="min-h-screen bg-background text-foreground">
    <nav aria-label="Main navigation" className="border-b border-border">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 px-4 sm:px-8 py-4">
        <Link to="/" className="flex items-center gap-2 font-semibold text-lg">
          <Award className="size-5 text-primary" />certera.ink
        </Link>
        <div className="flex items-center gap-1 sm:gap-3">
          <Button variant="ghost" size="sm" asChild><Link to="/verify">Verify</Link></Button>
          <Button variant="outline" size="sm" asChild><Link to="/auth">Sign in</Link></Button>
        </div>
      </div>
    </nav>
    <main>
      <section className="px-4 sm:px-8 pt-10 sm:pt-14 pb-8 text-center">
        <p className="text-xs font-mono text-muted-foreground mb-4">DESIGNED BY YOU. VERIFIED ON HEDERA.</p>
        <h1 className="text-3xl sm:text-5xl font-semibold leading-tight">Diplomas that earn trust.</h1>
        <p className="max-w-lg mx-auto mt-4 text-sm sm:text-base text-muted-foreground leading-relaxed">
          Create a beautiful diploma with your AI diploma agent.<br className="hidden sm:block" /> Sign it on Hedera. Share proof that lasts.
        </p>
        <div className="flex justify-center flex-wrap gap-3 mt-6 mb-8 sm:mb-10">
          <Button asChild><Link to="/demo">Design a diploma <ArrowRight className="size-4 ml-2" /></Link></Button>
          <Button variant="outline" asChild><Link to="/auth">Start issuing</Link></Button>
        </div>
        {sample && (
          <figure className="max-w-[800px] mx-auto text-left">
            <div className="landing-document overflow-hidden rounded-sm">
              <DiplomaFrame html={sample.html} css={sample.css} title="Sample diploma — Ashford University" minHeight={0} fitToWidth />
            </div>
            <figcaption className="flex flex-wrap justify-between items-center gap-3 mt-4 text-xs sm:text-sm">
              <div className="flex items-center gap-2"><CheckCircle2 className="size-5 text-success shrink-0" /><span className="font-medium">Authentic diploma<span className="block text-xs text-muted-foreground font-normal">Registered on Hedera when signed</span></span></div>
              <span className="text-xs text-muted-foreground">Sample · Classic University</span>
            </figcaption>
          </figure>
        )}
      </section>
      <section aria-label="Design, sign and share" className="border-y border-border bg-card/50">
        <ol className="max-w-5xl mx-auto grid sm:grid-cols-3 gap-7 sm:gap-8 px-6 sm:px-8 py-10 sm:py-12">
          {steps.map((step, index) => (
            <li key={step.title} className="flex gap-4">
              <step.icon className="size-5 text-primary mt-1 shrink-0" />
              <div><h2 className="text-sm font-semibold"><span className="text-muted-foreground font-mono mr-2">0{index + 1}</span>{step.title}</h2><p className="mt-2 text-sm text-muted-foreground leading-relaxed">{step.description}</p></div>
            </li>
          ))}
        </ol>
      </section>
      <section className="max-w-5xl mx-auto px-6 sm:px-8 py-14 sm:py-20 grid md:grid-cols-2 gap-8 md:gap-16">
        <div><p className="text-xs font-mono text-muted-foreground mb-3">A CREDENTIAL. NOT JUST A FILE.</p><h2 className="text-2xl font-semibold leading-snug">Celebrate achievement.<br />Make authenticity clear.</h2></div>
        <div className="space-y-6 text-sm">
          <div><h3 className="font-medium mb-2">For academies, teams and training providers</h3><p className="text-muted-foreground leading-relaxed">From course completions to academic awards, start with a curated design and refine it through conversation.</p></div>
          <div><h3 className="font-medium mb-2">Proof anyone can check</h3><p className="text-muted-foreground leading-relaxed">Each signed diploma has a SHA-256 fingerprint recorded on Hedera, with a public verification link and QR code.</p></div>
          <Button variant="outline" asChild><Link to="/demo">Try the studio <ArrowRight className="size-4 ml-2" /></Link></Button>
        </div>
      </section>
    </main>
    <footer className="border-t border-border">
      <div className="max-w-6xl mx-auto px-6 sm:px-8 py-7 flex flex-col sm:flex-row justify-between gap-5 text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} certera.ink</p>
        <nav aria-label="Footer navigation" className="flex flex-wrap gap-5">
          <Link className="hover:text-foreground focus-visible:outline-ring" to="/verify">Verify a diploma</Link>
          <Link className="hover:text-foreground focus-visible:outline-ring" to="/demo">Demo</Link>
          <Link className="hover:text-foreground focus-visible:outline-ring" to="/auth">Sign in</Link>
        </nav>
      </div>
    </footer>
  </div>
);

export default Landing;
