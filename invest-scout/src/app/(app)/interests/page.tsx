import { InterestPicker } from "@/components/app/InterestPicker";

export default function InterestsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Interests</h1>
        <p className="text-muted-foreground">
          Pick sectors, industries/niches, countries, and keywords to tailor your news and opportunity feeds.
        </p>
      </div>
      <InterestPicker />
    </div>
  );
}
