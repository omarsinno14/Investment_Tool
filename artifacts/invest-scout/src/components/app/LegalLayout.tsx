import type { ReactNode } from "react";
import { Link } from "wouter";
import { SiteFooter } from "@/components/app/SiteFooter";

const LEGAL_PAGES = [
  { href: "/legal/terms", label: "Terms of Service" },
  { href: "/legal/privacy", label: "Privacy Policy" },
  { href: "/legal/risk-disclosure", label: "Risk Disclosure" },
  { href: "/legal/advertiser-terms", label: "Advertiser Terms" },
  { href: "/legal/subscription-terms", label: "Subscription Terms" },
  { href: "/legal/community-guidelines", label: "Community Guidelines" },
];

export function LegalLayout({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary selection:text-primary-foreground">
      <header className="border-b bg-card/60 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-4">
          <Link
            href="/"
            className="flex items-center gap-2 font-serif text-lg font-semibold tracking-tight text-foreground"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background text-sm">
              V
            </span>
            Vertica
          </Link>
          <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Sign in
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <article className="mx-auto w-full max-w-3xl px-4 py-12">
          <header className="space-y-3 border-b pb-8">
            <p className="text-xs font-medium uppercase tracking-widest text-accent">Legal</p>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
            <p className="text-sm text-muted-foreground">Last updated: June 2026</p>
            {intro ? (
              <p className="pt-2 text-base leading-relaxed text-muted-foreground">{intro}</p>
            ) : null}
          </header>

          <div className="space-y-8 py-8 text-sm leading-relaxed text-foreground/90 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-foreground [&_h3]:font-medium [&_h3]:text-foreground [&_p]:text-foreground/80 [&_li]:text-foreground/80 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_section]:space-y-3 [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2">
            {children}
          </div>

          <nav className="mt-4 border-t pt-8">
            <p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">
              More legal documents
            </p>
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {LEGAL_PAGES.map((p) => (
                <li key={p.href}>
                  <Link href={p.href} className="text-muted-foreground hover:text-foreground">
                    {p.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </article>
      </main>

      <SiteFooter />
    </div>
  );
}
