import type { EventArgs, EventName, Prop } from './events.js';
import { installProvider, type ProviderConfig, type ProviderName, type Sender } from './providers.js';

export { countBucket, type AnalyticsEvents, type CountBucket, type EventName } from './events.js';
export type { ProviderConfig, ProviderName } from './providers.js';

/** Set this in localStorage (to "1") on a device to leave it out of the numbers, for example your own. */
export const OPT_OUT_KEY = 'p2e-no-analytics';

export interface InitOptions {
  /** Overrides the build-time settings. Mostly for tests. */
  config?: Partial<ProviderConfig>;
  /** Log events to the console, and allow running on localhost. A provider is then optional. */
  debug?: boolean;
  /** Keep the address's query string out of page views. Use it on a page whose address holds a secret. */
  excludeSearch?: boolean;
}

const PROVIDERS: readonly string[] = ['plausible', 'umami'];

let sender: Sender | null = null;
let debug = false;
let started = false;

function optedOut(): boolean {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  if (nav.doNotTrack === '1' || nav.doNotTrack === 'yes') return true;
  if (nav.globalPrivacyControl === true) return true;
  try {
    return localStorage.getItem(OPT_OUT_KEY) === '1';
  } catch {
    return false;
  }
}

function isLocal(): boolean {
  const { protocol, hostname } = location;
  return protocol === 'file:' || hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

/** Vite fills these in at build time. Read through a cast so apps need not include Vite's types. */
function buildEnv(): Record<string, string | undefined> {
  return (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
}

function envConfig(): Partial<ProviderConfig> {
  const env = buildEnv();
  return {
    provider: env.VITE_ANALYTICS_PROVIDER as ProviderName | undefined,
    site: env.VITE_ANALYTICS_SITE,
    src: env.VITE_ANALYTICS_SRC || undefined,
  };
}

/**
 * Start analytics for this page. Safe to call on every page: it does nothing unless a provider is
 * configured (VITE_ANALYTICS_PROVIDER and VITE_ANALYTICS_SITE), and nothing for visitors who send
 * Do Not Track or Global Privacy Control, have opted out here, or are on localhost.
 * Returns true if events will be sent or logged.
 */
export function initAnalytics(options: InitOptions = {}): boolean {
  if (started) return sender !== null || debug;
  started = true;
  if (typeof document === 'undefined') return false;

  debug = options.debug ?? buildEnv().VITE_ANALYTICS_DEBUG === '1';
  if (optedOut()) return false;
  if (isLocal() && !debug) return false;

  const config = { ...envConfig(), ...options.config, excludeSearch: options.excludeSearch };
  const wanted = Boolean(config.provider || config.site);
  if (!config.provider || !PROVIDERS.includes(config.provider) || !config.site) {
    if (wanted) console.warn('[analytics] Not started: set both a provider (plausible or umami) and a site.');
    return debug;
  }

  sender = installProvider(config as ProviderConfig);
  if (!sender && wanted) console.warn(`[analytics] ${config.provider} needs a script address (VITE_ANALYTICS_SRC).`);
  return sender !== null || debug;
}

/** Record that something happened. Does nothing until initAnalytics has started a provider. */
export function track<N extends EventName>(name: N, ...args: EventArgs<N>): void {
  if (!sender && !debug) return;
  const props = args[0] as Record<string, Prop> | undefined;
  try {
    if (debug) console.debug('[analytics]', name, props ?? '');
    sender?.send(name, props);
  } catch {
    // Analytics must never break the app.
  }
}

/** Forget everything. For tests. */
export function resetAnalytics(): void {
  sender = null;
  debug = false;
  started = false;
}
