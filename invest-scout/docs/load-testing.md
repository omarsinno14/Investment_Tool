# Load testing

## Tooling
We use [k6](https://k6.io/) to simulate read-heavy and write-heavy traffic.

## Scenarios
- `scripts/load-tests/feed.js` – read-heavy feed fetch.
- `scripts/load-tests/write.js` – bursty likes/comments.
- `scripts/load-tests/uploads.js` – upload presign load.

## Running locally
```bash
npm install -g k6
# Read-heavy feed
BASE_URL=http://localhost:3000 AUTH_COOKIE="next-auth.session-token=..." k6 run scripts/load-tests/feed.js

# Write burst (requires a forum post ID)
BASE_URL=http://localhost:3000 AUTH_COOKIE="next-auth.session-token=..." POST_ID=abc123 k6 run scripts/load-tests/write.js

# Upload presign
BASE_URL=http://localhost:3000 AUTH_COOKIE="next-auth.session-token=..." k6 run scripts/load-tests/uploads.js
```

## Results summary
Capture before/after metrics (throughput, p95 latency, error rate) by running the scenarios above in staging.

Example template:

| Scenario | Throughput (rps) | p95 latency | Error rate |
| --- | --- | --- | --- |
| Feed baseline | TBD | TBD | TBD |
| Feed improved | TBD | TBD | TBD |
| Writes baseline | TBD | TBD | TBD |
| Writes improved | TBD | TBD | TBD |

> Note: Results are environment-specific; record your own numbers in staging before production rollout.
