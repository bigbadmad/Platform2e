import { el } from './dom.js';
import { attachHelp } from './help.js';
import './tokens.css';
import './platformBar.css';

export type PlatformApp = 'home' | 'character' | 'dungeon' | 'tracker';

export const PLATFORM_LINKS: ReadonlyArray<{ id: Exclude<PlatformApp, 'home'>; label: string }> = [
  { id: 'character', label: 'Characters' },
  { id: 'dungeon', label: 'Dungeons' },
  { id: 'tracker', label: 'Tracker' },
];

/**
 * Add the platform navigation bar above the page.
 *
 * Every tool is served from `<site root>/<id>/` and the home page from the site root, so the links are
 * relative and work wherever the site is hosted. Calling it twice returns the bar already on the page.
 */
export function mountPlatformBar(current: PlatformApp): HTMLElement {
  const existing = document.querySelector<HTMLElement>('.p2e-bar');
  if (existing) return existing;

  const root = current === 'home' ? './' : '../';
  const bar = el('nav', { cls: 'p2e-bar', attrs: { 'aria-label': 'AD&D 2e tools' } });

  const brand = el('a', { cls: 'p2e-bar__brand', text: 'AD&D 2e Tools', attrs: { href: root } });
  if (current === 'home') brand.setAttribute('aria-current', 'page');
  bar.append(brand);

  for (const link of PLATFORM_LINKS) {
    const a = el('a', { cls: 'p2e-bar__link', text: link.label, attrs: { href: `${root}${link.id}/` } });
    if (link.id === current) a.setAttribute('aria-current', 'page');
    bar.append(a);
  }

  document.body.prepend(bar);
  attachHelp(bar);
  return bar;
}
