import { Button } from "@/components/ui/button";
import { Award, ArrowRight, Shield, Zap, Globe, CheckCircle, Building2, FileCheck, Lock, BarChart3, BadgeCheck, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Landing = () => {
  const navigate = useNavigate();

  const painPoints = [
    { stat: "Seconds", label: "to verify a diploma with a link or QR code" },
    { stat: "0", label: "accounts needed to check a credential" },
    { stat: "SHA-256", label: "fingerprint on every diploma, recorded on Hedera" },
  ];

  const features = [
    { icon: Shield, title: "Immutable Blockchain Records", desc: "Every diploma is hashed and stored on Hedera Hashgraph — tamper-proof and publicly verifiable." },
    { icon: Zap, title: "Issue in Minutes, Not Weeks", desc: "AI-assisted design and one-click signing. No complex setup, no vendor lock-in." },
    { icon: Globe, title: "Instant Global Verification", desc: "Anyone can verify a credential with a link or QR code — no account needed." },
    { icon: Lock, title: "Cryptographic Proof", desc: "SHA-256 content hashing ensures document integrity. Any alteration is immediately detectable." },
    { icon: BarChart3, title: "Verification Analytics", desc: "Track how often credentials are verified and by whom — measure your program's reach." },
    { icon: FileCheck, title: "Embeddable & Shareable", desc: "Recipients embed verified diplomas on websites, LinkedIn, or portfolios with one click." },
  ];

  const competitors = [
    { name: "Credly", weakness: "Badge-only, no full diplomas. $3K+/year. Owned by Pearson." },
    { name: "Accredible", weakness: "No blockchain verification. Complex pricing tiers. Slow setup." },
    { name: "Certifier", weakness: "No on-chain proof. Limited customization. Per-credential fees." },
  ];

  const useCases = [
    { icon: Building2, title: "Training Companies", desc: "Issue verifiable certificates for professional development programs." },
    { icon: BadgeCheck, title: "Bootcamps & Academies", desc: "Give graduates credentials employers can trust instantly." },
    { icon: Clock, title: "Corporate L&D", desc: "Certify internal training completions with auditable blockchain records." },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="bg-primary/15 border border-primary/20 p-1.5 rounded-lg">
              <Award className="w-5 h-5 text-primary" />
            </div>
            <span className="text-lg font-semibold tracking-tight text-foreground">certera.ink</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/demo')}>
              Try Demo
            </Button>
            <Button size="sm" onClick={() => navigate('/auth')}>
              Start Issuing
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero — B2B pitch */}
      <section className="max-w-3xl mx-auto text-center px-6 pt-24 pb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card text-xs text-muted-foreground mb-6">
          <CheckCircle className="w-3 h-3 text-primary" />
          Blockchain-verified on Hedera Hashgraph
        </div>
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-foreground leading-tight mb-5">
          Issue diplomas your recipients — and their employers — can trust
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8 leading-relaxed">
          Blockchain-verified credentials that prove authenticity in seconds. No middlemen, no annual contracts, no per-seat pricing.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button size="lg" onClick={() => navigate('/auth')}>
            Start Issuing Free <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate('/demo')}>
            See It in Action
          </Button>
        </div>
      </section>

      {/* Pain points */}
      <section className="border-y border-border bg-card/50">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border py-8 px-6">
          {painPoints.map((p) => (
            <div key={p.stat} className="text-center py-4 md:py-0">
              <p className="text-2xl font-semibold text-foreground">{p.stat}</p>
              <p className="text-xs text-muted-foreground mt-1">{p.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Use cases */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground text-center mb-3">
          Built for organizations that certify
        </h2>
        <p className="text-sm text-muted-foreground text-center mb-12 max-w-lg mx-auto">
          Whether you run a bootcamp, corporate training, or professional academy — your credentials deserve blockchain-grade trust.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {useCases.map((u) => (
            <div key={u.title} className="p-5 rounded-xl border border-border bg-card text-center">
              <u.icon className="w-6 h-6 text-primary mx-auto mb-3" />
              <h3 className="text-sm font-medium text-foreground mb-1.5">{u.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{u.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="border-y border-border bg-card/30">
        <div className="max-w-4xl mx-auto px-6 py-20">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground text-center mb-12">
            Why organizations choose certera.ink
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="group p-5 rounded-xl border border-border bg-background hover:border-primary/30 transition-colors">
                <f.icon className="w-5 h-5 text-primary mb-3" />
                <h3 className="text-sm font-medium text-foreground mb-1.5">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Competitor comparison */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground text-center mb-3">
          How we compare
        </h2>
        <p className="text-sm text-muted-foreground text-center mb-10 max-w-lg mx-auto">
          Legacy credential platforms charge thousands per year and still can't prove document integrity on-chain.
        </p>
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-card border-b border-border">
                <th className="text-left p-4 font-medium text-foreground">Platform</th>
                <th className="text-left p-4 font-medium text-foreground">Blockchain Proof</th>
                <th className="text-left p-4 font-medium text-foreground hidden md:table-cell">Limitation</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border bg-primary/5">
                <td className="p-4 font-medium text-foreground flex items-center gap-2">
                  <Award className="w-4 h-4 text-primary" />
                  certera.ink
                </td>
                <td className="p-4">
                  <span className="inline-flex items-center gap-1 text-primary text-xs font-medium">
                    <CheckCircle className="w-3 h-3" /> Hedera Hashgraph
                  </span>
                </td>
                <td className="p-4 text-muted-foreground hidden md:table-cell">Open, transparent, no vendor lock-in</td>
              </tr>
              {competitors.map((c) => (
                <tr key={c.name} className="border-b border-border last:border-b-0">
                  <td className="p-4 text-foreground">{c.name}</td>
                  <td className="p-4 text-xs text-muted-foreground">None</td>
                  <td className="p-4 text-xs text-muted-foreground hidden md:table-cell">{c.weakness}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-card/30">
        <div className="max-w-3xl mx-auto text-center px-6 py-20">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-4">
            Ready to issue credentials that speak for themselves?
          </h2>
          <p className="text-muted-foreground mb-8">
            Create your first blockchain-verified diploma in under 5 minutes. No credit card required.
          </p>
          <Button size="lg" onClick={() => navigate('/auth')}>
            Start Issuing Free <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center">
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} certera.ink. Blockchain-verified credentials for the modern world.
        </p>
      </footer>
    </div>
  );
};

export default Landing;
