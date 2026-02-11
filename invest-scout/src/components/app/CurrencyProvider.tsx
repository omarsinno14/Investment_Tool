"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

const STORAGE_KEY = "invescout-preferred-currency";
const RATE_CACHE_KEY = "invescout-currency-rates";
const RATE_CACHE_TTL_MS = 1000 * 60 * 60 * 12;

export const SUPPORTED_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "CAD",
  "AUD",
  "NZD",
  "JPY",
  "CHF",
  "CNY",
  "INR",
  "SGD",
  "HKD",
  "AED",
  "SAR",
  "ZAR",
  "NGN",
  "KES",
  "EGP",
  "TRY",
  "BRL",
  "MXN",
];

export type CurrencyState = {
  currency: string;
  rates: Record<string, number>;
  lastUpdated: string | null;
  setCurrency: (currency: string) => void;
  convert: (amount: number, fromCurrency?: string, toCurrency?: string) => number;
  format: (amount: number, opts?: Intl.NumberFormatOptions & { currency?: string; fromCurrency?: string }) => string;
};

const CurrencyContext = createContext<CurrencyState | null>(null);

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch (e) {
    return fallback;
  }
}

function isSupportedCurrency(currency: string) {
  return SUPPORTED_CURRENCIES.includes(currency);
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState("USD");
  const [rates, setRates] = useState<Record<string, number>>({ USD: 1 });
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const parsed = stored && isSupportedCurrency(stored) ? stored : null;
    if (parsed) {
      setCurrencyState(parsed);
    } else {
      (async () => {
        try {
          const res = await fetch("/api/user/profile", { credentials: "include" });
          if (!res.ok) return;
          const data = await res.json().catch(() => ({}));
          const profileCurrency = data?.profile?.currency;
          if (profileCurrency && isSupportedCurrency(profileCurrency)) {
            setCurrencyState(profileCurrency);
            window.localStorage.setItem(STORAGE_KEY, profileCurrency);
          }
        } catch (e) {
          console.error("Failed to load preferred currency", e);
        }
      })();
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const cached = safeParse<{ timestamp: number; rates: Record<string, number> } | null>(
      window.localStorage.getItem(RATE_CACHE_KEY),
      null
    );
    if (cached && Date.now() - cached.timestamp < RATE_CACHE_TTL_MS) {
      setRates({ ...cached.rates, USD: 1 });
      setLastUpdated(new Date(cached.timestamp).toLocaleString());
      return;
    }

    (async () => {
      try {
        const res = await fetch("https://api.exchangerate.host/latest?base=USD");
        if (!res.ok) throw new Error("Failed to fetch exchange rates");
        const data = await res.json().catch(() => ({}));
        if (!data?.rates) return;
        const nextRates = { ...data.rates, USD: 1 } as Record<string, number>;
        setRates(nextRates);
        const ts = Date.now();
        setLastUpdated(new Date(ts).toLocaleString());
        window.localStorage.setItem(RATE_CACHE_KEY, JSON.stringify({ timestamp: ts, rates: nextRates }));
      } catch (e) {
        console.error("Failed to fetch exchange rates", e);
      }
    })();
  }, []);

  function setCurrency(next: string) {
    if (!isSupportedCurrency(next)) return;
    setCurrencyState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
  }

  function convert(amount: number, fromCurrency = "USD", toCurrency = currency) {
    const fromRate = rates[fromCurrency] ?? 1;
    const toRate = rates[toCurrency] ?? 1;
    if (!fromRate || !toRate) return amount;
    return (amount / fromRate) * toRate;
  }

  function format(
    amount: number,
    opts: Intl.NumberFormatOptions & { currency?: string; fromCurrency?: string } = {}
  ) {
    const { currency: targetCurrency, fromCurrency, ...formatOptions } = opts;
    const target = targetCurrency ?? currency;
    const from = fromCurrency ?? target;
    const converted = from === target ? amount : convert(amount, from, target);
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: target,
      maximumFractionDigits: 2,
      ...formatOptions,
    }).format(converted);
  }

  const value = useMemo<CurrencyState>(
    () => ({ currency, rates, lastUpdated, setCurrency, convert, format }),
    [currency, rates, lastUpdated]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    throw new Error("useCurrency must be used within CurrencyProvider");
  }
  return ctx;
}
