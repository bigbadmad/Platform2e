// Extension pages may not load remote scripts, and the usage providers are remote scripts.
// vite.config.ts aliases @platform2e/analytics to this file so the panel never starts one.
export function initAnalytics(): boolean {
  return false;
}
