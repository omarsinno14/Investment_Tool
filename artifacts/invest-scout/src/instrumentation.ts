export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const mod = await import("./instrumentation-node");
    if (typeof mod.register === "function") await mod.register();
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    const mod = await import("./instrumentation-edge");
    if (typeof mod.register === "function") await mod.register();
  }
}
