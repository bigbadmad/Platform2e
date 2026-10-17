import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

type Mod = typeof import('../src/index.js');
let mod: Mod;

const scripts = () => Array.from(document.head.querySelectorAll('script'));
const setNav = (key: string, value: unknown) =>
  Object.defineProperty(navigator, key, { value, configurable: true });

const plausibleConfig = { provider: 'plausible', site: 'example.com' } as const;

beforeEach(async () => {
  vi.resetModules();
  mod = await import('../src/index.js');
  mod.resetAnalytics();
  document.head.innerHTML = '';
  localStorage.clear();
  delete (window as unknown as Record<string, unknown>).plausible;
  delete (window as unknown as Record<string, unknown>).umami;
});

afterEach(() => {
  vi.restoreAllMocks();
  for (const key of ['doNotTrack', 'globalPrivacyControl']) {
    Reflect.deleteProperty(navigator, key);
  }
});

// jsdom serves pages from http://localhost, so these tests run with debug on to allow that.
const init = (config?: Parameters<Mod['initAnalytics']>[0]) => mod.initAnalytics({ debug: true, ...config });

describe('starting up', () => {
  it('adds nothing to the page when no provider is configured', () => {
    expect(mod.initAnalytics({ debug: false, config: {} })).toBe(false);
    expect(scripts()).toHaveLength(0);
  });

  it('does not run on localhost unless debugging', () => {
    expect(mod.initAnalytics({ debug: false, config: plausibleConfig })).toBe(false);
    expect(scripts()).toHaveLength(0);
  });

  it('adds the Plausible script with the site domain', () => {
    init({ config: plausibleConfig });
    const [s] = scripts();
    expect(s.src).toBe('https://plausible.io/js/script.js');
    expect(s.getAttribute('data-domain')).toBe('example.com');
    expect(s.defer).toBe(true);
  });

  it('uses a custom script address when given', () => {
    init({ config: { ...plausibleConfig, src: 'https://stats.example.org/js/script.js' } });
    expect(scripts()[0].src).toBe('https://stats.example.org/js/script.js');
  });

  it('adds the Umami script with the website id', () => {
    init({ config: { provider: 'umami', site: 'abc-123', src: 'https://umami.example.org/script.js' } });
    const [s] = scripts();
    expect(s.src).toBe('https://umami.example.org/script.js');
    expect(s.getAttribute('data-website-id')).toBe('abc-123');
  });

  it('tells Umami to leave the query string out when asked, and only then', () => {
    const umami = { provider: 'umami', site: 'abc', src: 'https://umami.example.org/script.js' } as const;
    init({ config: umami, excludeSearch: true });
    expect(scripts()[0].getAttribute('data-exclude-search')).toBe('true');
    mod.resetAnalytics();
    document.head.innerHTML = '';
    init({ config: umami });
    expect(scripts()[0].hasAttribute('data-exclude-search')).toBe(false);
  });

  it('adds nothing extra to the Plausible script when asked to exclude the query string', () => {
    init({ config: plausibleConfig, excludeSearch: true });
    expect(scripts()[0].attributes).toHaveLength(3); // defer, src, data-domain
  });

  it('refuses Umami without a script address, with a warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    init({ config: { provider: 'umami', site: 'abc-123' } });
    expect(scripts()).toHaveLength(0);
    expect(warn).toHaveBeenCalled();
  });

  it('warns about a half-finished setup and an unknown provider', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    init({ config: { provider: 'plausible' } });
    expect(warn).toHaveBeenCalledTimes(1);
    mod.resetAnalytics();
    init({ config: { provider: 'nope' as never, site: 'x' } });
    expect(warn).toHaveBeenCalledTimes(2);
    expect(scripts()).toHaveLength(0);
  });

  it('only starts once', () => {
    init({ config: plausibleConfig });
    init({ config: plausibleConfig });
    expect(scripts()).toHaveLength(1);
  });
});

describe('visitors who opt out', () => {
  it.each([
    ['Do Not Track', () => setNav('doNotTrack', '1')],
    ['Global Privacy Control', () => setNav('globalPrivacyControl', true)],
    ['the local opt-out flag', () => localStorage.setItem(mod.OPT_OUT_KEY, '1')],
  ])('send nothing with %s', (_label, optOut) => {
    optOut();
    expect(init({ config: plausibleConfig })).toBe(false);
    expect(scripts()).toHaveLength(0);
    expect((window as unknown as Record<string, unknown>).plausible).toBeUndefined();
  });
});

describe('sending events (Plausible)', () => {
  it('queues events made before the script loads, with props wrapped as Plausible expects', () => {
    init({ config: plausibleConfig });
    mod.track('character_rolled', { method: '4d6' });
    mod.track('dungeon_saved');
    const q = (window as unknown as { plausible: { q: unknown[][] } }).plausible.q;
    expect(q.map((args) => [...args])).toEqual([
      ['character_rolled', { props: { method: '4d6' } }],
      ['dungeon_saved', undefined],
    ]);
  });

  it('calls the real function once the script has replaced the stub', () => {
    init({ config: plausibleConfig });
    const real = vi.fn();
    (window as unknown as { plausible: unknown }).plausible = real;
    mod.track('tracker_random_encounter', { terrain: 'forest' });
    expect(real).toHaveBeenCalledWith('tracker_random_encounter', { props: { terrain: 'forest' } });
  });
});

describe('sending events (Umami)', () => {
  const umamiConfig = { provider: 'umami', site: 'abc', src: 'https://u.example.org/script.js' } as const;

  it('holds events until the script loads, then sends them in order', () => {
    init({ config: umamiConfig });
    mod.track('dungeon_generated', { mode: 'full', size: 'medium', level: 3 });
    mod.track('dungeon_loaded');
    const track = vi.fn();
    (window as unknown as { umami: unknown }).umami = { track };
    scripts()[0].dispatchEvent(new Event('load'));
    expect(track.mock.calls).toEqual([
      ['dungeon_generated', { mode: 'full', size: 'medium', level: 3 }],
      ['dungeon_loaded', undefined],
    ]);
  });

  it('sends straight away once loaded', () => {
    init({ config: umamiConfig });
    const track = vi.fn();
    (window as unknown as { umami: unknown }).umami = { track };
    mod.track('tracker_exported');
    expect(track).toHaveBeenCalledWith('tracker_exported', undefined);
  });
});

describe('track', () => {
  it('does nothing before analytics has started', () => {
    expect(() => mod.track('dungeon_saved')).not.toThrow();
  });

  it('never throws, even if the provider does', () => {
    init({ config: plausibleConfig });
    (window as unknown as { plausible: unknown }).plausible = () => {
      throw new Error('blocked');
    };
    expect(() => mod.track('dungeon_saved')).not.toThrow();
  });

  it('logs to the console in debug mode, even with no provider', () => {
    const log = vi.spyOn(console, 'debug').mockImplementation(() => {});
    expect(init({ config: {} })).toBe(true);
    mod.track('tracker_encounter_started', { players: '2-3', monsters: '4-6' });
    expect(log).toHaveBeenCalledWith('[analytics]', 'tracker_encounter_started', { players: '2-3', monsters: '4-6' });
    expect(scripts()).toHaveLength(0);
  });
});

describe('countBucket', () => {
  it('groups counts', () => {
    expect([0, 1, 2, 3, 4, 6, 7, 10, 11, 40].map(mod.countBucket)).toEqual([
      '0', '1', '2-3', '2-3', '4-6', '4-6', '7-10', '7-10', '11+', '11+',
    ]);
  });
});
