import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Swatch = ({ name, varName }: { name: string; varName: string }) => (
  <div className="flex items-center gap-3 p-3 rounded-lg border" style={{ background: "hsl(var(--card))" }}>
    <div className="w-10 h-10 rounded-md border" style={{ background: `hsl(var(${varName}))` }} />
    <div className="text-sm">
      <div className="font-medium">{name}</div>
      <div className="text-muted-foreground">{varName}</div>
    </div>
  </div>
);

const StyleGuide = () => {
  useEffect(() => {
    document.title = "Student UI Style Guide"; // SEO title
    const desc = "Reusable design system: colors, typography, buttons, cards, and animations for the student platform.";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', desc);
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', window.location.href);
  }, []);

  return (
    <main className="container mx-auto px-4 py-10 space-y-10 animate-fade-in">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Student UI Style Guide</h1>
        <p className="text-muted-foreground max-w-2xl">
          Reference components and tokens derived from the certification dashboard. Use these patterns across the student platform for a consistent UI.
        </p>
      </header>

      <section aria-labelledby="foundations" className="space-y-4">
        <h2 id="foundations" className="text-xl font-semibold">Foundations</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Swatch name="Primary" varName="--primary" />
          <Swatch name="Primary Glow" varName="--primary-glow" />
          <Swatch name="Secondary" varName="--secondary" />
          <Swatch name="Muted" varName="--muted" />
          <Swatch name="Success" varName="--success" />
          <Swatch name="Warning" varName="--warning" />
        </div>
      </section>

      <section aria-labelledby="typography" className="space-y-4">
        <h2 id="typography" className="text-xl font-semibold">Typography</h2>
        <Card className="animate-scale-in">
          <CardHeader>
            <CardTitle>Heading Scale</CardTitle>
            <CardDescription>Use a single H1 per page; subsequent sections use H2/H3.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <h1 className="text-3xl">H1 – Page title</h1>
            <h2 className="text-xl">H2 – Section title</h2>
            <h3 className="text-lg">H3 – Subsection</h3>
            <p className="text-muted-foreground">Body text – default paragraph styling for descriptions.</p>
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="buttons" className="space-y-4">
        <h2 id="buttons" className="text-xl font-semibold">Buttons</h2>
        <div className="flex flex-wrap gap-3">
          <Button className="hover-scale">Primary</Button>
          <Button variant="outline" className="hover-scale">Outline</Button>
          <Button variant="secondary" className="hover-scale">Secondary</Button>
          <Button variant="ghost" className="hover-scale">Ghost</Button>
          <Button variant="link" className="story-link">Link</Button>
        </div>
        <div className="text-sm text-muted-foreground">Primary uses hsl(var(--primary)) and adjusts automatically for dark mode.</div>
      </section>

      <section aria-labelledby="badges" className="space-y-4">
        <h2 id="badges" className="text-xl font-semibold">Badges</h2>
        <div className="flex flex-wrap gap-2">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge variant="outline">Outline</Badge>
        </div>
      </section>

      <section aria-labelledby="cards" className="space-y-4">
        <h2 id="cards" className="text-xl font-semibold">Cards</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="hover-scale">
            <CardHeader>
              <CardTitle>Callout</CardTitle>
              <CardDescription>Use for highlighted actions or info.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-muted-foreground">Keep copy concise and action‑oriented.</p>
              <Button>Primary Action</Button>
            </CardContent>
          </Card>
          <Card className="hover-scale">
            <CardHeader>
              <CardTitle>Next Step</CardTitle>
              <CardDescription>Pair with imagery and a clear CTA.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <img
                src="/lovable-uploads/3a670ee2-e426-42af-8552-52ae196d3a3f.png"
                alt="Graduation cap illustration"
                className="rounded-lg border"
                loading="lazy"
              />
              <Button variant="outline">Learn More</Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <section aria-labelledby="imagery" className="space-y-4">
        <h2 id="imagery" className="text-xl font-semibold">Imagery</h2>
        <p className="text-muted-foreground max-w-2xl">Use rounded images with subtle borders. Always provide descriptive alt text and lazy‑load non‑critical images.</p>
        <div className="grid gap-4 md:grid-cols-2">
          <img src="/lovable-uploads/f6e52a98-da86-4b5e-8692-2493d2b19184.png" alt="Moving scene illustration used for primary CTA" className="rounded-xl border" loading="lazy" />
          <img src="/lovable-uploads/3a670ee2-e426-42af-8552-52ae196d3a3f.png" alt="Graduation cap, Level 2 certification" className="rounded-xl border" loading="lazy" />
        </div>
      </section>

      <aside className="text-sm text-muted-foreground">
        Accessibility: ensure color contrast passes WCAG. Prefer semantic tags (header, main, section, article, nav, aside). One H1 per page.
      </aside>
    </main>
  );
};

export default StyleGuide;
