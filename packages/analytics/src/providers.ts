import type { Prop } from './events.js';

export type ProviderName = 'plausible' | 'umami';

export interface ProviderConfig {
  provider: ProviderName;
  /** Plausible: the site domain. Umami: the website id. */
  site: string;
  /** Script address. Defaults to Plausible's hosted script. Required for Umami. */
  src?: string;
  /**
   * Leave the address's query string out of page views (Umami). For pages whose address holds
   * something private, such as a session join code.
   */
  excludeSearch?: boolean;
}

const PROVIDER_NAMES: readonly string[] = ['plausible', 'umami'];

/** True when the settings are enough to start a provider: a known one, a site, and a script for Umami. */
export function isConfigured(config: Partial<ProviderConfig>): config is ProviderConfig {
  if (!config.provider || !PROVIDER_NAMES.includes(config.provider) || !config.site) return false;
  return config.provider !== 'umami' || Boolean(config.src);
}

export interface Sender {
  send(name: string, props?: Record<string, Prop>): void;
}

const PLAUSIBLE_SRC = 'https://plausible.io/js/script.js';

function addScript(src: string, attrs: Record<string, string>, onLoad?: () => void): void {
  const script = document.createElement('script');
  script.defer = true;
  script.src = src;
  for (const [name, value] of Object.entries(attrs)) script.setAttribute(name, value);
  if (onLoad) script.addEventListener('load', onLoad);
  document.head.append(script);
}

type PlausibleFn = ((name: string, options?: { props: Record<string, Prop> }) => void) & { q?: unknown[] };

function plausible(config: ProviderConfig): Sender {
  const w = window as unknown as { plausible?: PlausibleFn };
  // The usual queue stub: calls made before the script arrives are kept and sent when it loads.
  if (!w.plausible) {
    const stub: PlausibleFn = function (...args: unknown[]) {
      (stub.q = stub.q || []).push(args);
    } as PlausibleFn;
    w.plausible = stub;
  }
  addScript(config.src ?? PLAUSIBLE_SRC, { 'data-domain': config.site });
  return {
    send(name, props) {
      w.plausible?.(name, props ? { props } : undefined);
    },
  };
}

type UmamiApi = { track(name: string, data?: Record<string, Prop>): unknown };

function umami(config: ProviderConfig): Sender | null {
  if (!config.src) return null;
  const w = window as unknown as { umami?: UmamiApi };
  const pending: Array<[string, Record<string, Prop> | undefined]> = [];
  const attrs: Record<string, string> = { 'data-website-id': config.site };
  if (config.excludeSearch) attrs['data-exclude-search'] = 'true';
  addScript(config.src, attrs, () => {
    for (const [name, props] of pending.splice(0)) w.umami?.track(name, props);
  });
  return {
    send(name, props) {
      if (w.umami) w.umami.track(name, props);
      else if (pending.length < 50) pending.push([name, props]);
    },
  };
}

/** Add the provider's script to the page and return the way to send it events. */
export function installProvider(config: ProviderConfig): Sender | null {
  switch (config.provider) {
    case 'plausible':
      return plausible(config);
    case 'umami':
      return umami(config);
    default:
      return null;
  }
}
