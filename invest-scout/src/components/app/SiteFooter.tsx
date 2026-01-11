"use client";

export function SiteFooter() {
  return (
    <footer className="border-t bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
        <span>© 2026 Invesco. All rights reserved.</span>
        <span>
          This platform provides information and advertisements only. It is not financial advice and does not
          endorse or encourage any specific investment. Invesco is not liable for investment decisions made
          based on content here. Always do your own research.
        </span>
      </div>
    </footer>
  );
}
