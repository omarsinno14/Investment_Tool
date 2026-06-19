

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ASSET_CLASSES, CITIES_BY_COUNTRY, COUNTRIES, INTEREST_TYPES, REITS, STRATEGIES, SUBTOPICS } from "@/lib/interests";

type Interest = { type: string; value: string; parent?: string | null };

function keyOf(i: Interest) {
  return `${i.type}:${i.value}`;
}

export function InterestPicker() {
  const [selected, setSelected] = useState<Interest[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [custom, setCustom] = useState("");

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/user/interests", { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setSelected(data.interests ?? []);
      else toast.error(data?.error ?? "Failed to load interests");
      setLoading(false);
    })();
  }, []);

  const selectedSet = useMemo(() => new Set(selected.map(keyOf)), [selected]);

  function toggle(interest: Interest) {
    const key = keyOf(interest);
    if (selectedSet.has(key)) setSelected((p) => p.filter((i) => keyOf(i) !== key));
    else setSelected((p) => [...p, interest]);
  }

  async function save() {
    setSaving(true);
    const res = await fetch("/api/user/interests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ interests: selected }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) toast.error(data?.error ?? "Failed to save interests");
    else toast.success("Real-estate interests saved");
    setSaving(false);
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      {[{ title: "Asset Class", type: INTEREST_TYPES.ASSET_CLASS, values: ASSET_CLASSES }, { title: "Strategy", type: INTEREST_TYPES.STRATEGY, values: STRATEGIES }, { title: "REIT", type: INTEREST_TYPES.REIT, values: REITS }, { title: "Subtopics", type: INTEREST_TYPES.SUBTOPIC, values: SUBTOPICS }].map((section) => (
        <Card key={section.title}>
          <CardHeader><CardTitle className="text-base">{section.title}</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {section.values.map((v) => (
              <label key={v} className="flex items-center gap-2 text-sm">
                <Checkbox checked={selectedSet.has(`${section.type}:${v}`)} onCheckedChange={() => toggle({ type: section.type, value: v })} />
                {v}
              </label>
            ))}
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader><CardTitle className="text-base">Countries & Cities</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {COUNTRIES.map((country) => (
            <div key={country} className="space-y-2">
              <label className="flex items-center gap-2 font-medium text-sm">
                <Checkbox checked={selectedSet.has(`COUNTRY:${country}`)} onCheckedChange={() => toggle({ type: INTEREST_TYPES.COUNTRY, value: country })} />
                {country}
              </label>
              <div className="ml-6 grid grid-cols-2 gap-2 md:grid-cols-3">
                {(CITIES_BY_COUNTRY[country] ?? []).map((city) => (
                  <label key={city} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={selectedSet.has(`CITY:${city}`)} onCheckedChange={() => toggle({ type: INTEREST_TYPES.CITY, value: city, parent: country })} />
                    {city}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Custom keywords</CardTitle></CardHeader>
        <CardContent className="flex gap-2">
          <Input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Optional keywords" />
          <Button type="button" variant="outline" onClick={() => { if (custom.trim()) { toggle({ type: INTEREST_TYPES.CUSTOM, value: custom.trim() }); setCustom(""); } }}>Add</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Selected</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {selected.map((i) => <Badge key={keyOf(i)}>{i.type}: {i.value} <button onClick={() => toggle(i)}><X className="h-3 w-3 inline"/></button></Badge>)}
          </div>
          <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
