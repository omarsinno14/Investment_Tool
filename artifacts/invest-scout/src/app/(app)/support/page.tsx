import { useState } from "react";
import { LifeBuoy, Mail, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const FAQS = [
  {
    q: "How do I get the verified badge?",
    a: "Open Settings → Verification and submit a government ID. Our team reviews requests and, once approved, a verified tick appears on your profile.",
  },
  {
    q: "How do I report a post, message, or user?",
    a: "Use the report option (flag icon) available on posts, messages, and profiles. Reports go straight to our moderation team.",
  },
  {
    q: "Why was my message blocked?",
    a: "Vertica filters profanity and abusive language automatically. Revise your message and try again.",
  },
  {
    q: "How do I change my interests or country?",
    a: "Go to Settings to update your profile, interests, and location — this also tailors the news and opportunities you see.",
  },
];

export default function SupportPage() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      toast.error("Please add a subject and message");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message, email: email || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to send");
      setDone(true);
      setSubject("");
      setMessage("");
      setEmail("");
      toast.success("Your request has been sent. We'll be in touch.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-foreground text-background">
          <LifeBuoy className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Support</h1>
          <p className="text-sm text-muted-foreground">We're here to help. Send us a message and we'll get back to you.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Contact us</CardTitle></CardHeader>
          <CardContent>
            {done ? (
              <div className="space-y-3 py-4 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <p className="font-medium">Message received</p>
                <p className="text-sm text-muted-foreground">Our team will reply to you soon.</p>
                <Button variant="outline" onClick={() => setDone(false)}>Send another</Button>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={submit}>
                <div className="space-y-1.5">
                  <Label>Subject</Label>
                  <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="What do you need help with?" />
                </div>
                <div className="space-y-1.5">
                  <Label>Message</Label>
                  <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Describe your issue in detail" rows={5} />
                </div>
                <div className="space-y-1.5">
                  <Label>Reply-to email <span className="text-muted-foreground">(optional if logged in)</span></Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                </div>
                <Button type="submit" disabled={submitting} className="w-full">
                  <Send className="mr-2 h-4 w-4" />
                  {submitting ? "Sending…" : "Send message"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Frequently asked</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {FAQS.map((f) => (
              <div key={f.q} className="border-b pb-4 last:border-0 last:pb-0">
                <p className="font-medium">{f.q}</p>
                <p className="mt-1 text-sm text-muted-foreground">{f.a}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
