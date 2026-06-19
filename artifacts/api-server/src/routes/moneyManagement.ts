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

export default router;
