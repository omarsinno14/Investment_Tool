import { getPrismaClient } from "@/lib/db";
import { requireUserId } from "@/lib/auth-server";
import { jsonResponse, withTiming } from "@/lib/api-response";
import { getRequestId } from "@/lib/request-context";
import { logger } from "@/lib/logger";

export async function DELETE(_req: Request, { params }: { params: { id?: string } }) {
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

      await prisma.message.delete({ where: { id } });

      if (message.conversationId) {
        const last = await prisma.message.findFirst({
          where: { conversationId: message.conversationId },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        });
        await prisma.conversation.update({
          where: { id: message.conversationId },
          data: { lastMessageAt: last?.createdAt ?? null },
        });
      }

      return jsonResponse(_req, { ok: true }, 200, "messages.delete", requestId);
    } catch (e) {
      logger.error({ err: e }, "Failed to delete message");
      return jsonResponse(_req, { error: "Failed to delete message" }, 500, "messages.delete", requestId);
    }
  }, _req, "messages.delete");
}
