

import { Card, CardContent } from "@/components/ui/card";
import { AntiScamNotice } from "@/components/app/AntiScamNotice";

export function DisclosureBanner() {
  return (
    <div className="space-y-3">
      <Card className="border-dashed">
        <CardContent className="py-3 text-xs text-muted-foreground">
          This platform provides information and advertisements only. It is not financial advice and
          does not endorse or encourage any specific investment. Vertica is not liable for
          investment decisions made based on content here. Always do your own research.
        </CardContent>
      </Card>
      <AntiScamNotice />
    </div>
  );
}
