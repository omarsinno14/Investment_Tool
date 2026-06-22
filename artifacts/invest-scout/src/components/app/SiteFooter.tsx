

import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { SUPPORTED_CURRENCIES } from "@/components/app/CurrencyProvider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function SiteFooter() {
  const [feedback, setFeedback] = useState("");
  const [supportAmount, setSupportAmount] = useState("");
  const [supportCurrency, setSupportCurrency] = useState("USD");

  function sendFeedback() {
    if (!feedback.trim()) {
      toast.error("Share your feedback first");
      return;
    }
    toast.success("Thanks for the feedback!");
    setFeedback("");
  }

  function submitSupport() {
    if (!supportAmount.trim()) {
      toast.error("Enter a support amount");
      return;
    }
    toast.success("Support pledge recorded. Thank you!");
    setSupportAmount("");
  }

  return (
    <footer className="border-t bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
        <span>© 2026 Vertica. All rights reserved.</span>
        <div className="flex flex-wrap items-center gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">Feedback</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Send feedback</DialogTitle>
              </DialogHeader>
              <Textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Share what's working, what's missing, or bug reports..."
                rows={4}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setFeedback("")}>Clear</Button>
                <Button onClick={sendFeedback}>Send feedback</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">Support us</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Support the platform</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  type="number"
                  value={supportAmount}
                  onChange={(e) => setSupportAmount(e.target.value)}
                  placeholder="Amount"
                />
                <Select value={supportCurrency} onValueChange={setSupportCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_CURRENCIES.map((code) => (
                      <SelectItem key={code} value={code}>
                        {code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button onClick={submitSupport}>Pledge support</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <span>
          This platform provides information and advertisements only. It is not financial advice and does not
          endorse or encourage any specific investment. Vertica is not liable for investment decisions made
          based on content here. Always do your own research.
        </span>
      </div>
      <div className="border-t">
        <nav className="mx-auto flex w-full max-w-6xl flex-wrap gap-x-5 gap-y-2 px-4 py-4 text-xs text-muted-foreground">
          <Link href="/legal/terms" className="hover:text-foreground">Terms of Service</Link>
          <Link href="/legal/privacy" className="hover:text-foreground">Privacy Policy</Link>
          <Link href="/legal/risk-disclosure" className="hover:text-foreground">Risk Disclosure</Link>
          <Link href="/legal/advertiser-terms" className="hover:text-foreground">Advertiser Terms</Link>
          <Link href="/legal/subscription-terms" className="hover:text-foreground">Subscription Terms</Link>
          <Link href="/legal/community-guidelines" className="hover:text-foreground">Community Guidelines</Link>
        </nav>
      </div>
    </footer>
  );
}
