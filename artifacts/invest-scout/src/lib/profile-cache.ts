/**
 * Shared, short-lived cache for GET /api/user/profile.
 *
 * The app shell, currency/finance providers and several pages all need the
 * viewer's profile on mount. Without this they each fired their own request on
 * every navigation; now concurrent callers share one in-flight request and
 * reuse the result for a few seconds.
 */
export type ProfileResult = { status: number; ok: boolean; data: any };

const TTL_MS = 10_000;
let cached: { at: number; promise: Promise<ProfileResult> } | null = null;

export function fetchProfile(options: { force?: boolean } = {}): Promise<ProfileResult> {
  const fresh = cached && Date.now() - cached.at < TTL_MS;
  if (!options.force && fresh) return cached!.promise;

  const promise = fetch("/api/user/profile", { credentials: "include" })
    .then(async (res) => ({ status: res.status, ok: res.ok, data: await res.json().catch(() => ({})) }))
    .catch((err) => {
      cached = null;
      throw err;
    });
  cached = { at: Date.now(), promise };
  // Don't keep failed lookups (e.g. 401 before login) around.
  promise.then((r) => {
    if (!r.ok && cached?.promise === promise) cached = null;
  }, () => undefined);
  return promise;
}

/** Call after the profile changes (settings save, photo upload, login/logout). */
export function invalidateProfile() {
  cached = null;
}
