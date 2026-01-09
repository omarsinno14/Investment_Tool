import { Navbar } from "@/components/app/Navbar";
import { FooterDisclaimer } from "@/components/app/FooterDisclaimer";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 flex-1">{children}</main>
      <FooterDisclaimer />
    </div>
  );
}
