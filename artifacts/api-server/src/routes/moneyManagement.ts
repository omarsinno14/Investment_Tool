import { Router } from "express";
import { prisma } from "../lib/db.js";
import { logger } from "../lib/logger.js";

const router = Router();

function requireAuth(req: any, res: any): string | null {
  if (!req.session.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return req.session.userId as string;
}

router.get("/user/money-management", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const data = await prisma.moneyManagement.findUnique({
      where: { userId },
      include: { snapshots: { orderBy: { createdAt: "desc" }, take: 12 } },
    });
    return res.json({ moneyManagement: data });
  } catch (e) {
    logger.error({ err: e }, "MoneyManagement GET error");
    return res.status(500).json({ error: "Failed to load money management" });
  }
});

router.post("/user/money-management", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const body = req.body ?? {};
    const fields: any = {};
    const numericFields = ["incomeMonthly", "incomeYearly", "taxRate", "investmentsValue", "investmentsCashflow", "debts", "spendingDaily", "liabilities", "spendingWeekly", "spendingMonthly", "savingsCurrent", "goalSavings", "goalInvestments", "goalNetWorth"];
    const intFields = ["dependents"];
    const boolFields = ["hideSensitive"];
    const strFields = ["locationCountry", "locationRegion"];

    for (const f of numericFields) {
      if (body[f] !== undefined) fields[f] = body[f] !== null ? Number(body[f]) : null;
    }
    for (const f of intFields) {
      if (body[f] !== undefined) fields[f] = body[f] !== null ? parseInt(body[f]) : null;
    }
    for (const f of boolFields) {
      if (body[f] !== undefined) fields[f] = Boolean(body[f]);
    }
    for (const f of strFields) {
      if (body[f] !== undefined) fields[f] = body[f] ?? null;
    }

    const data = await prisma.moneyManagement.upsert({
      where: { userId },
      create: { userId, ...fields },
      update: fields,
    });
    return res.json({ moneyManagement: data });
  } catch (e) {
    logger.error({ err: e }, "MoneyManagement POST error");
    return res.status(500).json({ error: "Failed to save money management" });
  }
});

router.get("/user/journal", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const entries = await prisma.journalEntry.findMany({
      where: { ownerId: userId },
      orderBy: { entryDate: "desc" },
      take: 50,
      select: { id: true, title: true, body: true, entryDate: true, createdAt: true, updatedAt: true },
    });
    return res.json({ entries });
  } catch (e) {
    logger.error({ err: e }, "Journal GET error");
    return res.status(500).json({ error: "Failed to load journal" });
  }
});

router.get("/user/activity", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const activities = notifications.map((n) => ({
      id: n.id,
      type: n.type,
      body: typeof n.data === "object" && n.data !== null ? (n.data as any).body ?? null : null,
      createdAt: n.createdAt,
    }));
    return res.json({ activities });
  } catch (e) {
    logger.error({ err: e }, "Activity GET error");
    return res.status(500).json({ error: "Failed to load activity" });
  }
});

router.get("/user/portfolio", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const mm = await prisma.moneyManagement.findUnique({ where: { userId } });
    const items = mm?.investmentsValue != null
      ? [{ id: "portfolio-summary", name: "Total Investments", type: "Portfolio", currentValue: mm.investmentsValue, currency: "USD" }]
      : [];
    return res.json({ items });
  } catch (e) {
    logger.error({ err: e }, "Portfolio GET error");
    return res.status(500).json({ error: "Failed to load portfolio" });
  }
});

router.get("/user/cashflow", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const mm = await prisma.moneyManagement.findUnique({
      where: { userId },
      include: { snapshots: { orderBy: { createdAt: "desc" }, take: 12 } },
    });
    const entries = (mm?.snapshots ?? []).map((s, idx) => ({
      id: s.id,
      description: `Month ${idx + 1} snapshot`,
      amount: Math.abs(s.netCashflow),
      type: s.netCashflow >= 0 ? "INCOME" : "EXPENSE",
      category: "Net cashflow",
      date: s.createdAt,
      currency: "USD",
    }));
    return res.json({ entries });
  } catch (e) {
    logger.error({ err: e }, "Cashflow GET error");
    return res.status(500).json({ error: "Failed to load cashflow" });
  }
});

router.get("/user/goals", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const mm = await prisma.moneyManagement.findUnique({ where: { userId } });
    const goals = [];
    if (mm?.goalSavings != null) goals.push({ id: "goal-savings", title: "Savings goal", targetAmount: mm.goalSavings, currentAmount: mm.savingsCurrent ?? 0, currency: "USD", status: "active" });
    if (mm?.goalInvestments != null) goals.push({ id: "goal-investments", title: "Investment goal", targetAmount: mm.goalInvestments, currentAmount: mm.investmentsValue ?? 0, currency: "USD", status: "active" });
    if (mm?.goalNetWorth != null) goals.push({ id: "goal-networth", title: "Net worth goal", targetAmount: mm.goalNetWorth, currency: "USD", status: "active" });
    return res.json({ goals });
  } catch (e) {
    logger.error({ err: e }, "Goals GET error");
    return res.status(500).json({ error: "Failed to load goals" });
  }
});

router.get("/user/ratios", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const mm = await prisma.moneyManagement.findUnique({ where: { userId } });
    const ratios = [];
    if (mm?.debts != null && mm?.incomeYearly != null && mm.incomeYearly > 0) {
      ratios.push({ id: "dti", name: "Debt-to-Income", value: mm.debts / mm.incomeYearly, benchmark: 0.36, category: "Debt", description: "Total debt divided by annual income. Lower is better." });
    }
    if (mm?.savingsCurrent != null && mm?.incomeMonthly != null && mm.incomeMonthly > 0) {
      ratios.push({ id: "savings-rate", name: "Savings Rate", value: mm.savingsCurrent / mm.incomeMonthly, benchmark: 0.2, category: "Savings", description: "Monthly savings as a share of income. Higher is better." });
    }
    if (mm?.liabilities != null && mm?.investmentsValue != null && mm.liabilities > 0) {
      ratios.push({ id: "leverage", name: "Leverage Ratio", value: mm.liabilities / (mm.investmentsValue || 1), benchmark: 0.5, category: "Leverage", description: "Liabilities relative to investment value." });
    }
    return res.json({ ratios });
  } catch (e) {
    logger.error({ err: e }, "Ratios GET error");
    return res.status(500).json({ error: "Failed to load ratios" });
  }
});

export default router;
