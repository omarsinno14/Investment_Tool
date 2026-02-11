"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type SpendingItem = {
  id: string;
  label: string;
  amount: number;
};

export type CashflowEntry = {
  id: string;
  grossMonthly: number;
  netMonthly: number;
  spendingTotal: number;
  spendingBreakdown: SpendingItem[];
  comments: string;
  source: string;
  createdAt: string;
  updatedAt: string;
};

export type PortfolioAsset = {
  id: string;
  name: string;
  type: string;
  initialValue: number;
  currentValue: number;
  currency: string;
  comments: string;
  source: string;
  createdAt: string;
  updatedAt: string;
};

export type PortfolioSnapshot = {
  id: string;
  totalValue: number;
  totalGain: number;
  netWorth: number;
  createdAt: string;
};

export type GoalEntry = {
  id: string;
  name: string;
  type: string;
  timeline: string;
  targetAmount: number;
  currentAmount: number;
  comments: string;
  source: string;
  createdAt: string;
  updatedAt: string;
};

export type RatioEntry = {
  id: string;
  debts: number;
  liabilities: number;
  cash: number;
  annualEarnings: number;
  comments: string;
  source: string;
  createdAt: string;
  updatedAt: string;
};

export type PersonalFinanceData = {
  cashflows: CashflowEntry[];
  assets: PortfolioAsset[];
  goals: GoalEntry[];
  ratios: RatioEntry[];
  portfolioSnapshots: PortfolioSnapshot[];
};

export type PersonalFinanceTotals = {
  totalAssets: number;
  totalInitialAssets: number;
  totalCash: number;
  totalDebts: number;
  totalLiabilities: number;
  netWorth: number;
  netMonthlyIncome: number;
  spendingMonthly: number;
};

export type PersonalFinanceContextValue = {
  data: PersonalFinanceData;
  totals: PersonalFinanceTotals;
  saveCashflow: (entry: Omit<CashflowEntry, "id" | "createdAt" | "updatedAt">) => void;
  updateCashflow: (id: string, update: Partial<CashflowEntry>) => void;
  removeCashflow: (id: string) => void;
  addAsset: (asset: Omit<PortfolioAsset, "id" | "createdAt" | "updatedAt">) => void;
  updateAsset: (id: string, update: Partial<PortfolioAsset>) => void;
  removeAsset: (id: string) => void;
  addGoal: (goal: Omit<GoalEntry, "id" | "createdAt" | "updatedAt">) => void;
  updateGoal: (id: string, update: Partial<GoalEntry>) => void;
  removeGoal: (id: string) => void;
  addRatio: (ratio: Omit<RatioEntry, "id" | "createdAt" | "updatedAt">) => void;
  updateRatio: (id: string, update: Partial<RatioEntry>) => void;
  removeRatio: (id: string) => void;
  addPortfolioSnapshot: () => void;
};

const STORAGE_KEY = "invescout-personal-finance";

const defaultData: PersonalFinanceData = {
  cashflows: [],
  assets: [],
  goals: [],
  ratios: [],
  portfolioSnapshots: [],
};

const PersonalFinanceContext = createContext<PersonalFinanceContextValue | null>(null);

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function readStorage(storageKey: string): PersonalFinanceData {
  if (typeof window === "undefined") return defaultData;
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) return defaultData;
  try {
    return { ...defaultData, ...(JSON.parse(raw) as PersonalFinanceData) };
  } catch (e) {
    console.error("Failed to parse personal finance storage", e);
    return defaultData;
  }
}

export function PersonalFinanceProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<PersonalFinanceData>(defaultData);
  const [storageKey, setStorageKey] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadKey() {
      try {
        const res = await fetch("/api/user/profile", { credentials: "include" });
        if (!res.ok) throw new Error("Profile unavailable");
        const data = await res.json();
        const userId = data?.profile?.userId;
        if (active) {
          setStorageKey(userId ? `${STORAGE_KEY}:${userId}` : STORAGE_KEY);
        }
      } catch (e) {
        console.error("Failed to load personal finance user scope", e);
        if (active) {
          setStorageKey(STORAGE_KEY);
        }
      }
    }
    loadKey();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!storageKey) return;
    setData(readStorage(storageKey));
  }, [storageKey]);

  useEffect(() => {
    if (typeof window === "undefined" || !storageKey) return;
    window.localStorage.setItem(storageKey, JSON.stringify(data));
  }, [data, storageKey]);

  const totals = useMemo<PersonalFinanceTotals>(() => {
    const totalAssets = data.assets.reduce((sum, asset) => sum + asset.currentValue, 0);
    const totalInitialAssets = data.assets.reduce((sum, asset) => sum + asset.initialValue, 0);
    const totalCash = data.assets
      .filter((asset) => asset.type.toLowerCase().includes("cash"))
      .reduce((sum, asset) => sum + asset.currentValue, 0);
    const latestRatio = data.ratios.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    const totalDebts = latestRatio?.debts ?? 0;
    const totalLiabilities = latestRatio?.liabilities ?? 0;
    const netWorth = totalAssets - totalDebts - totalLiabilities;
    const latestCashflow = data.cashflows.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    const netMonthlyIncome = latestCashflow?.netMonthly ?? 0;
    const spendingMonthly = latestCashflow?.spendingTotal ?? 0;
    return {
      totalAssets,
      totalInitialAssets,
      totalCash,
      totalDebts,
      totalLiabilities,
      netWorth,
      netMonthlyIncome,
      spendingMonthly,
    };
  }, [data]);

  function saveCashflow(entry: Omit<CashflowEntry, "id" | "createdAt" | "updatedAt">) {
    const timestamp = new Date().toISOString();
    const payload: CashflowEntry = {
      ...entry,
      id: createId(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    setData((prev) => ({ ...prev, cashflows: [payload, ...prev.cashflows].slice(0, 50) }));
  }

  function updateCashflow(id: string, update: Partial<CashflowEntry>) {
    const timestamp = new Date().toISOString();
    setData((prev) => ({
      ...prev,
      cashflows: prev.cashflows.map((item) =>
        item.id === id ? { ...item, ...update, updatedAt: timestamp } : item
      ),
    }));
  }

  function removeCashflow(id: string) {
    setData((prev) => ({ ...prev, cashflows: prev.cashflows.filter((item) => item.id !== id) }));
  }

  function addAsset(asset: Omit<PortfolioAsset, "id" | "createdAt" | "updatedAt">) {
    const timestamp = new Date().toISOString();
    const payload: PortfolioAsset = {
      ...asset,
      id: createId(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    setData((prev) => ({ ...prev, assets: [payload, ...prev.assets] }));
  }

  function updateAsset(id: string, update: Partial<PortfolioAsset>) {
    const timestamp = new Date().toISOString();
    setData((prev) => ({
      ...prev,
      assets: prev.assets.map((asset) =>
        asset.id === id ? { ...asset, ...update, updatedAt: timestamp } : asset
      ),
    }));
  }

  function removeAsset(id: string) {
    setData((prev) => ({ ...prev, assets: prev.assets.filter((asset) => asset.id !== id) }));
  }

  function addGoal(goal: Omit<GoalEntry, "id" | "createdAt" | "updatedAt">) {
    const timestamp = new Date().toISOString();
    const payload: GoalEntry = {
      ...goal,
      id: createId(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    setData((prev) => ({ ...prev, goals: [payload, ...prev.goals] }));
  }

  function updateGoal(id: string, update: Partial<GoalEntry>) {
    const timestamp = new Date().toISOString();
    setData((prev) => ({
      ...prev,
      goals: prev.goals.map((goal) =>
        goal.id === id ? { ...goal, ...update, updatedAt: timestamp } : goal
      ),
    }));
  }

  function removeGoal(id: string) {
    setData((prev) => ({ ...prev, goals: prev.goals.filter((goal) => goal.id !== id) }));
  }

  function addRatio(ratio: Omit<RatioEntry, "id" | "createdAt" | "updatedAt">) {
    const timestamp = new Date().toISOString();
    const payload: RatioEntry = {
      ...ratio,
      id: createId(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    setData((prev) => ({ ...prev, ratios: [payload, ...prev.ratios].slice(0, 50) }));
  }

  function updateRatio(id: string, update: Partial<RatioEntry>) {
    const timestamp = new Date().toISOString();
    setData((prev) => ({
      ...prev,
      ratios: prev.ratios.map((ratio) =>
        ratio.id === id ? { ...ratio, ...update, updatedAt: timestamp } : ratio
      ),
    }));
  }

  function removeRatio(id: string) {
    setData((prev) => ({ ...prev, ratios: prev.ratios.filter((ratio) => ratio.id !== id) }));
  }

  function addPortfolioSnapshot() {
    const timestamp = new Date().toISOString();
    setData((prev) => {
      const totalValue = prev.assets.reduce((sum, asset) => sum + asset.currentValue, 0);
      const totalInitial = prev.assets.reduce((sum, asset) => sum + asset.initialValue, 0);
      const latestRatio = prev.ratios.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
      const totalDebts = latestRatio?.debts ?? 0;
      const totalLiabilities = latestRatio?.liabilities ?? 0;
      const netWorth = totalValue - totalDebts - totalLiabilities;
      const snapshot: PortfolioSnapshot = {
        id: createId(),
        totalValue,
        totalGain: totalValue - totalInitial,
        netWorth,
        createdAt: timestamp,
      };
      return { ...prev, portfolioSnapshots: [snapshot, ...prev.portfolioSnapshots].slice(0, 60) };
    });
  }

  const value = useMemo<PersonalFinanceContextValue>(
    () => ({
      data,
      totals,
      saveCashflow,
      updateCashflow,
      removeCashflow,
      addAsset,
      updateAsset,
      removeAsset,
      addGoal,
      updateGoal,
      removeGoal,
      addRatio,
      updateRatio,
      removeRatio,
      addPortfolioSnapshot,
    }),
    [data, totals]
  );

  return <PersonalFinanceContext.Provider value={value}>{children}</PersonalFinanceContext.Provider>;
}

export function usePersonalFinance() {
  const ctx = useContext(PersonalFinanceContext);
  if (!ctx) {
    throw new Error("usePersonalFinance must be used within PersonalFinanceProvider");
  }
  return ctx;
}
