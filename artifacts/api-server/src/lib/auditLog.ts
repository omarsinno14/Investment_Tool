/**
 * auditLog.ts — best-effort audit logging helper.
 * Records key admin mutations. Never throws.
 */
import type { PrismaClient } from "@prisma/client";
import { logger } from "./logger.js";

export interface AuditLogInput {
  actorId: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: unknown;
}

export async function writeAuditLog(
  prisma: PrismaClient,
  { actorId, action, targetType, targetId, metadata }: AuditLogInput,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: actorId ?? null,
        action,
        targetType,
        targetId: targetId ?? null,
        metadata: (metadata ?? undefined) as any,
      },
    });
  } catch (e) {
    logger.error({ err: e }, "writeAuditLog failed");
  }
}
