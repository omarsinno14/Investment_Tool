import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 50,
  duration: "1m",
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<500"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const TOKEN = __ENV.AUTH_COOKIE || "";

export default function () {
  const res = http.get(`${BASE_URL}/api/opportunities?type=headlines&limit=25`, {
    headers: TOKEN ? { Cookie: TOKEN } : {},
  });
  check(res, {
    "status 200": (r) => r.status === 200,
  });
  sleep(1);
}
