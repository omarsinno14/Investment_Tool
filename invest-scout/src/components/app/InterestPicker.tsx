"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, ChevronsUpDown, X, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { COUNTRIES_ALL } from "@/lib/countries";
import { INDUSTRIES_BY_SECTOR, INTEREST_TYPES, SECTORS } from "@/lib/interests";
import { buildSmartSuggestions } from "@/lib/suggestions";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

type Interest = { type: string; value: string; parent?: string | null };

function keyOf(i: Interest) {
  return `${i.type}:${i.value}`;
}

function MultiSelectCombobox({
  title,
  placeholder,
  items,
  selectedSet,
  onToggle,
}: {
  title: string;
  placeholder: string;
  items: string[];
  selectedSet: Set<string>;
  onToggle: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const selectedCount = useMemo(() => {
    let c = 0;
    for (const it of items) if (selectedSet.has(it)) c++;
    return c;
  }, [items, selectedSet]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span>{title}</span>
          <span className="text-sm text-muted-foreground">{selectedCount} selected</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              {placeholder}
              <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[360px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search..." />
              <CommandList>
                <CommandEmpty>No results.</CommandEmpty>
                <CommandGroup>
                  <ScrollArea className="h-[320px]">
                    {items.map((item) => {
                      const isSelected = selectedSet.has(item);
                      return (
                        <CommandItem key={item} value={item} onSelect={() => onToggle(item)}>
                          <Check className={cn("mr-2 h-4 w-4", isSelected ? "opacity-100" : "opacity-0")} />
                          {item}
                        </CommandItem>
                      );
                    })}
                  </ScrollArea>
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </CardContent>
    </Card>
  );
}

export function InterestPicker() {
  const [selected, setSelected] = useState<Interest[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [sectorFilter, setSectorFilter] = useState<string | null>(null);
  const [custom, setCustom] = useState("");

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/user/interests");
      if (res.ok) {
        const data = await res.json();
        setSelected(data.interests ?? []);
      }
      setLoading(false);
    })();
  }, []);

  const selectedKeySet = useMemo(() => new Set(selected.map(keyOf)), [selected]);

  function isSelected(type: string, value: string) {
    return selectedKeySet.has(`${type}:${value}`);
  }

  function toggle(interest: Interest) {
    const k = keyOf(interest);
    if (selectedKeySet.has(k)) {
      setSelected((prev) => prev.filter((x) => keyOf(x) !== k));
    } else {
      setSelected((prev) => [...prev, interest]);
    }
  }

  const selectedSectors = useMemo(() => {
    const s = new Set<string>();
    for (const i of selected) if (i.type === INTEREST_TYPES.SECTOR) s.add(i.value);
    return s;
  }, [selected]);

  const selectedIndustries = useMemo(() => {
    const s = new Set<string>();
    for (const i of selected) if (i.type === INTEREST_TYPES.INDUSTRY) s.add(i.value);
    return s;
  }, [selected]);

  const selectedCountries = useMemo(() => {
    const s = new Set<string>();
    for (const i of selected) if (i.type === INTEREST_TYPES.COUNTRY) s.add(i.value);
    return s;
  }, [selected]);

  const industriesForSector = useMemo(() => {
    if (!sectorFilter) {
      const all = Object.values(INDUSTRIES_BY_SECTOR).flat();
      return Array.from(new Set(all)).sort((a, b) => a.localeCompare(b));
    }
    return (INDUSTRIES_BY_SECTOR[sectorFilter] ?? []).slice().sort((a, b) => a.localeCompare(b));
  }, [sectorFilter]);

  const smartSuggestions = useMemo(() => {
    return buildSmartSuggestions({
      query: custom,
      selectedCountries: Array.from(selectedCountries),
      selectedSectors: Array.from(selectedSectors),
      selectedIndustries: Array.from(selectedIndustries),
    });
  }, [custom, selectedCountries, selectedSectors, selectedIndustries]);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/user/interests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interests: selected }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data?.error ?? "Failed to save interests");
        return;
      }

      toast.success("Interests saved");
    } catch (e) {
      console.error(e);
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  function addCustom(value?: string) {
    const v = (value ?? custom).trim();
    if (!v) return;

    if (isSelected(INTEREST_TYPES.CUSTOM, v)) {
      toast.message("Already added");
      return;
    }

    toggle({ type: INTEREST_TYPES.CUSTOM, value: v });
    setCustom("");
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      {/* Left: pickers */}
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Industry filter (optional)</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button size="sm" variant={sectorFilter === null ? "default" : "outline"} onClick={() => setSectorFilter(null)}>
              All industries
            </Button>
            {SECTORS.map((s) => (
              <Button
                key={s}
                size="sm"
                variant={sectorFilter === s ? "default" : "outline"}
                onClick={() => setSectorFilter(s)}
              >
                {s}
              </Button>
            ))}
          </CardContent>
        </Card>

        <MultiSelectCombobox
          title="Sectors"
          placeholder="Search sectors..."
          items={SECTORS}
          selectedSet={selectedSectors}
          onToggle={(v) => toggle({ type: INTEREST_TYPES.SECTOR, value: v })}
        />

        <MultiSelectCombobox
          title="Industries / Niches"
          placeholder={sectorFilter ? `Search industries in ${sectorFilter}...` : "Search industries..."}
          items={industriesForSector}
          selectedSet={selectedIndustries}
          onToggle={(v) =>
            toggle({
              type: INTEREST_TYPES.INDUSTRY,
              value: v,
              parent: sectorFilter ?? null,
            })
          }
        />

        <MultiSelectCombobox
          title="Countries (worldwide)"
          placeholder="Search countries..."
          items={COUNTRIES_ALL}
          selectedSet={selectedCountries}
          onToggle={(v) => toggle({ type: INTEREST_TYPES.COUNTRY, value: v })}
        />

        {/* Custom keywords + Smart suggestions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Custom keywords</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder='e.g. "Dubai off-plan", "AI data centers", "Saudi banking"...'
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustom();
                  }
                }}
              />
              <Button onClick={() => addCustom()} variant="outline">
                Add
              </Button>
            </div>

            {custom.trim().length >= 2 && (
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Sparkles className="h-4 w-4" />
                  Smart suggestions
                </div>
                <div className="mt-2 grid gap-2">
                  {smartSuggestions.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No suggestions yet.</div>
                  ) : (
                    smartSuggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        className="text-left rounded-md border bg-background px-3 py-2 text-sm hover:bg-accent"
                        onClick={() => addCustom(s)}
                      >
                        {s}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right: selected + save */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Selected interests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {selected.length === 0 ? (
              <div className="text-sm text-muted-foreground">Nothing selected yet.</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {selected.map((i) => (
                  <Badge key={keyOf(i)} variant="secondary" className="flex items-center gap-1">
                    <span className="text-xs opacity-70">{i.type}:</span>
                    <span>{i.value}</span>
                    <button
                      className="ml-1 rounded-sm hover:opacity-70"
                      onClick={() => toggle(i)}
                      aria-label="Remove"
                      type="button"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            <div className="pt-2 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">{selected.length} total</div>
              <Button onClick={save} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pro tip</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <div>• Custom keywords are the strongest signal for your feed.</div>
            <div>• Use Country + Sector + a specific phrase (ex: “UAE banking M&A”).</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
