import { InterestPicker } from "@/components/app/InterestPicker";

export default function InterestsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Interests</h1>
        <p className="text-muted-foreground">
          Pick real-estate interests by asset class, strategy, REITs, market locations, and subtopics to personalize your feed.
        </p>
      </div>
      <InterestPicker />
    </div>
  );
}
