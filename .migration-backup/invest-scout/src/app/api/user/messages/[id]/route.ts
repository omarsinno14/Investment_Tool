import type { NextRequest } from "next/server";
import { getPrismaClient } from "@/lib/db";
import { requireUserId } from "@/lib/auth-server";
import { jsonResponse, withTiming } from "@/lib/api-response";
import { getRequestId } from "@/lib/request-context";
import { logger } from "@/lib/logger";
type Ctx = { params: { id: string } };

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  return withTiming(async () => {
    const requestId = getRequestId(_req);
    try {
      const prisma = getPrismaClient();
      if (!prisma) return jsonResponse(_req, { error: "Database unavailable" }, 500, "messages.delete", requestId);

      const userId = await requireUserId();
      if (!userId) return jsonResponse(_req, { error: "Unauthorized" }, 401, "messages.delete", requestId);

      const id = params.id;
      if (!id) return jsonResponse(_req, { error: "Missing id" }, 400, "messages.delete", requestId);

      const message = await prisma.message.findUnique({ where: { id } });
      if (!message) return jsonResponse(_req, { error: "Not found" }, 404, "messages.delete", requestId);
      if (message.fromUserId !== userId) {
        return jsonResponse(_req, { error: "Forbidden" }, 403, "messages.delete", requestId);
      }

      await prisma.message.update({
        where: { id },
        data: { body: "", deletedAt: new Date() },
      });

      return jsonResponse(_req, { ok: true }, 200, "messages.delete", requestId);
    } catch (e) {
      logger.error({ err: e }, "Failed to delete message");
      return jsonResponse(_req, { error: "Failed to delete message" }, 500, "messages.delete", requestId);
    }
  }, _req, "messages.delete");
}

export async function PATCH(_req: NextRequest, { params }: Ctx) {
  return withTiming(async () => {
    const requestId = getRequestId(_req);
    try {
      const prisma = getPrismaClient();
      if (!prisma) return jsonResponse(_req, { error: "Database unavailable" }, 500, "messages.edit", requestId);

      const userId = await requireUserId();
      if (!userId) return jsonResponse(_req, { error: "Unauthorized" }, 401, "messages.edit", requestId);

      const id = params.id;
      if (!id) return jsonResponse(_req, { error: "Missing id" }, 400, "messages.edit", requestId);

      const body = await _req.json().catch(() => null);
      const nextBody = String(body?.body ?? "").trim();
      if (!nextBody) {
        return jsonResponse(_req, { error: "Message is required" }, 400, "messages.edit", requestId);
      }

      const message = await prisma.message.findUnique({ where: { id } });
      if (!message) return jsonResponse(_req, { error: "Not found" }, 404, "messages.edit", requestId);
      if (message.fromUserId !== userId) {
        return jsonResponse(_req, { error: "Forbidden" }, 403, "messages.edit", requestId);
      }
      if (message.deletedAt) {
        return jsonResponse(_req, { error: "Message removed" }, 409, "messages.edit", requestId);
      }

      const updated = await prisma.message.update({
        where: { id },
        data: { body: nextBody, editedAt: new Date() },
      });

      return jsonResponse(_req, { message: updated }, 200, "messages.edit", requestId);
    } catch (e) {
      logger.error({ err: e }, "Failed to edit message");
      return jsonResponse(_req, { error: "Failed to edit message" }, 500, "messages.edit", requestId);
    }
  }, _req, "messages.edit");
}
