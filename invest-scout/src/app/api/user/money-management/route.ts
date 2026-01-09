import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/db";
import { requireUserId } from "@/lib/auth-server";

export async function GET() {
  try {
    const prisma = getPrismaClient();
    if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

    const userId = await requireUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const data = await prisma.moneyManagement.findUnique({
      where: { userId },
      include: {
        snapshots: { orderBy: { createdAt: "asc" }, take: 12 },
      },
    });
    return NextResponse.json({ money: data });
  } catch (e) {
    console.error("Failed to load money management", e);
    return NextResponse.json({ error: "Failed to load money management" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const prisma = getPrismaClient();
    if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

    const userId = await requireUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

    const money = await prisma.moneyManagement.upsert({
      where: { userId },
      create: {
        userId,
        incomeMonthly: typeof body.incomeMonthly === "number" ? body.incomeMonthly : null,
        incomeYearly: typeof body.incomeYearly === "number" ? body.incomeYearly : null,
        taxRate: typeof body.taxRate === "number" ? body.taxRate : null,
        locationCountry: body.locationCountry ?? null,
        locationRegion: body.locationRegion ?? null,
        investmentsValue: typeof body.investmentsValue === "number" ? body.investmentsValue : null,
        investmentsCashflow: typeof body.investmentsCashflow === "number" ? body.investmentsCashflow : null,
        debts: typeof body.debts === "number" ? body.debts : null,
        liabilities: typeof body.liabilities === "number" ? body.liabilities : null,
        spendingDaily: typeof body.spendingDaily === "number" ? body.spendingDaily : null,
        spendingWeekly: typeof body.spendingWeekly === "number" ? body.spendingWeekly : null,
        spendingMonthly: typeof body.spendingMonthly === "number" ? body.spendingMonthly : null,
        savingsCurrent: typeof body.savingsCurrent === "number" ? body.savingsCurrent : null,
        dependents: typeof body.dependents === "number" ? body.dependents : null,
        goalSavings: typeof body.goalSavings === "number" ? body.goalSavings : null,
        goalInvestments: typeof body.goalInvestments === "number" ? body.goalInvestments : null,
        goalNetWorth: typeof body.goalNetWorth === "number" ? body.goalNetWorth : null,
        hideSensitive: Boolean(body.hideSensitive),
      },
      update: {
        incomeMonthly: typeof body.incomeMonthly === "number" ? body.incomeMonthly : null,
        incomeYearly: typeof body.incomeYearly === "number" ? body.incomeYearly : null,
        taxRate: typeof body.taxRate === "number" ? body.taxRate : null,
        locationCountry: body.locationCountry ?? null,
        locationRegion: body.locationRegion ?? null,
        investmentsValue: typeof body.investmentsValue === "number" ? body.investmentsValue : null,
        investmentsCashflow: typeof body.investmentsCashflow === "number" ? body.investmentsCashflow : null,
        debts: typeof body.debts === "number" ? body.debts : null,
        liabilities: typeof body.liabilities === "number" ? body.liabilities : null,
        spendingDaily: typeof body.spendingDaily === "number" ? body.spendingDaily : null,
        spendingWeekly: typeof body.spendingWeekly === "number" ? body.spendingWeekly : null,
        spendingMonthly: typeof body.spendingMonthly === "number" ? body.spendingMonthly : null,
        savingsCurrent: typeof body.savingsCurrent === "number" ? body.savingsCurrent : null,
        dependents: typeof body.dependents === "number" ? body.dependents : null,
        goalSavings: typeof body.goalSavings === "number" ? body.goalSavings : null,
        goalInvestments: typeof body.goalInvestments === "number" ? body.goalInvestments : null,
        goalNetWorth: typeof body.goalNetWorth === "number" ? body.goalNetWorth : null,
        hideSensitive: Boolean(body.hideSensitive),
      },
    });

    const grossMonthly =
      (typeof body.incomeMonthly === "number" ? body.incomeMonthly : 0) ||
      (typeof body.incomeYearly === "number" ? body.incomeYearly / 12 : 0);
    const taxRate = typeof body.taxRate === "number" ? body.taxRate : 0;
    const netMonthly = grossMonthly * (1 - Math.min(Math.max(taxRate, 0), 100) / 100);
    const spendingMonthly = typeof body.spendingMonthly === "number" ? body.spendingMonthly : 0;
    const spendingWeekly = typeof body.spendingWeekly === "number" ? body.spendingWeekly : 0;
    const spendingDaily = typeof body.spendingDaily === "number" ? body.spendingDaily : 0;
    const spendingTotal = spendingMonthly + spendingWeekly * 4 + spendingDaily * 30;
    const investmentsCashflow = typeof body.investmentsCashflow === "number" ? body.investmentsCashflow : 0;
    const netCashflow = netMonthly + investmentsCashflow - spendingTotal;
    const savingsCurrent = typeof body.savingsCurrent === "number" ? body.savingsCurrent : 0;

    await prisma.moneySnapshot.create({
      data: {
        moneyManagementId: money.id,
        grossMonthly,
        netMonthly,
        spendingTotal,
        netCashflow,
        savingsCurrent,
      },
    });

    return NextResponse.json({ money });
  } catch (e) {
    console.error("Failed to save money management", e);
    return NextResponse.json({ error: "Failed to save money management" }, { status: 500 });
  }
}
