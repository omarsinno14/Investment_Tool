import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 10,
  duration: "1m",
  thresholds: {
    http_req_failed: ["rate<0.02"],
    http_req_duration: ["p(95)<800"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const TOKEN = __ENV.AUTH_COOKIE || "";

export default function () {
  const res = http.post(
    `${BASE_URL}/api/uploads/presign`,
    JSON.stringify({ folder: "forums", contentType: "image/jpeg", extension: "jpg" }),
    {
      headers: {
        "Content-Type": "application/json",
        ...(TOKEN ? { Cookie: TOKEN } : {}),
      },
    }
  );

  check(res, {
    "presign ok": (r) => r.status === 200,
  });

  sleep(1);
}
