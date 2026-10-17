import { describe, it, expect, beforeEach } from 'vitest';
import { mountPlatformBar, PLATFORM_LINKS } from '../src/index.js';

const links = () => Array.from(document.querySelectorAll<HTMLAnchorElement>('.p2e-bar a'));

describe('mountPlatformBar', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
  });

  it('adds a labelled nav as the first thing on the page', () => {
    const bar = mountPlatformBar('tracker');
    expect(document.body.firstElementChild).toBe(bar);
    expect(bar.tagName).toBe('NAV');
    expect(bar.getAttribute('aria-label')).toBeTruthy();
  });

  it('links to home and every tool', () => {
    mountPlatformBar('tracker');
    expect(links().map((a) => a.textContent)).toEqual(['AD&D 2e Tools', ...PLATFORM_LINKS.map((l) => l.label)]);
  });

  it('uses links that work from inside a tool folder', () => {
    mountPlatformBar('dungeon');
    expect(links().map((a) => a.getAttribute('href'))).toEqual(['../', '../character/', '../dungeon/', '../tracker/']);
  });

  it('uses links that work from the site root on the home page', () => {
    mountPlatformBar('home');
    expect(links().map((a) => a.getAttribute('href'))).toEqual(['./', './character/', './dungeon/', './tracker/']);
  });

  it('marks only the current page', () => {
    mountPlatformBar('character');
    const current = links().filter((a) => a.getAttribute('aria-current') === 'page');
    expect(current.map((a) => a.textContent)).toEqual(['Characters']);
  });

  it('marks the brand link on the home page', () => {
    mountPlatformBar('home');
    const current = links().filter((a) => a.getAttribute('aria-current') === 'page');
    expect(current.map((a) => a.textContent)).toEqual(['AD&D 2e Tools']);
  });

  it('does not add a second bar when called twice', () => {
    const first = mountPlatformBar('tracker');
    const second = mountPlatformBar('tracker');
    expect(second).toBe(first);
    expect(document.querySelectorAll('.p2e-bar')).toHaveLength(1);
  });
});
