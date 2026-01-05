import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getToken } from "next-auth/jwt";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const token = await getToken({ req: req as any, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const opp = await prisma.opportunity.findUnique({ where: { id: params.id } });
  if (!opp) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const action = await prisma.userOpportunityAction.findUnique({
    where: { userId_opportunityId: { userId: token.sub, opportunityId: params.id } },
  });

  return NextResponse.json({ opportunity: opp, action });
}
