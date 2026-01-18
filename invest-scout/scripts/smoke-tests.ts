import assert from "node:assert/strict";

process.env.DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/invest_scout?schema=public";

async function expectStatus(
  label: string,
  handler: (req: Request) => Promise<Response>,
  req: Request,
  expected: number
) {
  const res = await handler(req);
  assert.equal(res.status, expected, `${label} should return ${expected}`);
}

async function run() {
  const { POST: followPost } = await import("../src/app/api/user/follow/route");
  const { POST: blockPost } = await import("../src/app/api/user/block/route");
  const { GET: messagesGet } = await import("../src/app/api/user/messages/route");
  const { GET: notificationsGet } = await import("../src/app/api/user/notifications/route");

  await expectStatus(
    "Follow unauthenticated",
    followPost,
    new Request("http://localhost/api/user/follow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "user-123" }),
    }),
    401
  );

  await expectStatus(
    "Block unauthenticated",
    blockPost,
    new Request("http://localhost/api/user/block", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "user-123" }),
    }),
    401
  );

  await expectStatus(
    "Messages unauthenticated",
    messagesGet,
    new Request("http://localhost/api/user/messages"),
    401
  );

  await expectStatus(
    "Notifications unauthenticated",
    notificationsGet,
    new Request("http://localhost/api/user/notifications"),
    401
  );

  console.log("Smoke tests passed.");
}

run().catch((error) => {
  console.error("Smoke tests failed.", error);
  process.exitCode = 1;
});
