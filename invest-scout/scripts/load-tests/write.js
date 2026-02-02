import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "30s", target: 20 },
    { duration: "1m", target: 50 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.02"],
    http_req_duration: ["p(95)<800"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const TOKEN = __ENV.AUTH_COOKIE || "";
const POST_ID = __ENV.POST_ID || "";

export default function () {
  if (!POST_ID) {
    sleep(1);
    return;
  }

  const reaction = http.post(
    `${BASE_URL}/api/forums/${POST_ID}/reactions`,
    JSON.stringify({ type: "LIKE" }),
    {
      headers: {
        "Content-Type": "application/json",
        ...(TOKEN ? { Cookie: TOKEN } : {}),
      },
    }
  );

  check(reaction, {
    "reaction ok": (r) => r.status === 200,
  });

  const comment = http.post(
    `${BASE_URL}/api/forums/${POST_ID}/comments`,
    JSON.stringify({ body: `Load test comment ${Date.now()}` }),
    {
      headers: {
        "Content-Type": "application/json",
        ...(TOKEN ? { Cookie: TOKEN } : {}),
      },
    }
  );

  check(comment, {
    "comment ok": (r) => r.status === 200,
  });

  sleep(1);
}
