import { el } from './dom.js';

/** One block of help text: an optional heading, then paragraphs and/or a bullet list. */
export interface HelpSection {
  heading?: string;
  paragraphs?: string[];
  items?: string[];
}

export interface HelpTopic {
  title: string;
  sections: HelpSection[];
}

export interface HelpOptions {
  /** Every topic this page can show, by key. */
  topics: Record<string, HelpTopic>;
  /** The topic shown until setHelpTopic says otherwise. */
  initial: string;
  /** Called each time the panel is opened, with the topic on show. */
  onOpen?: (topic: string) => void;
}

let options: HelpOptions | null = null;
let current = '';
let bar: HTMLElement | null = null;
let button: HTMLButtonElement | null = null;
let panel: HTMLElement | null = null;
let body: HTMLElement | null = null;
let heading: HTMLElement | null = null;

const FALLBACK: HelpTopic = {
  title: 'Help',
  sections: [{ paragraphs: ['There is no help for this page yet.'] }],
};

function topic(): HelpTopic {
  return options?.topics[current] ?? FALLBACK;
}

function isOpen(): boolean {
  return panel !== null && !panel.hidden;
}

function render(): void {
  if (!panel || !body || !heading) return;
  const t = topic();
  heading.textContent = t.title;
  body.replaceChildren();
  for (const section of t.sections) {
    const block = el('section', { cls: 'p2e-help__section' });
    if (section.heading) block.append(el('h3', { cls: 'p2e-help__heading', text: section.heading }));
    for (const text of section.paragraphs ?? []) block.append(el('p', { cls: 'p2e-help__text', text }));
    if (section.items?.length) {
      const list = el('ul', { cls: 'p2e-help__list' });
      for (const item of section.items) list.append(el('li', { text: item }));
      block.append(list);
    }
    body.append(block);
  }
}

function place(): void {
  if (!panel || !bar) return;
  const top = Math.max(0, Math.round(bar.getBoundingClientRect().bottom));
  panel.style.top = `${top}px`;
  panel.style.maxHeight = `calc(100vh - ${top}px)`;
}

function open(): void {
  if (!panel || !button || isOpen()) return;
  render();
  panel.hidden = false;
  place();
  button.setAttribute('aria-expanded', 'true');
  panel.focus();
  options?.onOpen?.(current);
}

function close(): void {
  if (!panel || !button || !isOpen()) return;
  panel.hidden = true;
  button.setAttribute('aria-expanded', 'false');
  button.focus();
}

function toggle(): void {
  if (isOpen()) close();
  else open();
}

function typingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

function onKey(e: KeyboardEvent): void {
  if (e.key === 'Escape' && isOpen()) {
    close();
    return;
  }
  if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey && !typingTarget(e.target)) {
    e.preventDefault();
    toggle();
  }
}

/** Say what help this page has. Call once, before or after the bar is mounted. */
export function registerHelp(next: HelpOptions): void {
  options = next;
  current = next.initial;
  render();
}

/** Switch the help to another topic, for example when the screen changes. Never opens or closes it. */
export function setHelpTopic(key: string): void {
  if (!options?.topics[key] || key === current) return;
  current = key;
  render();
}

/** Build the Help button and its panel for the bar. Used by mountPlatformBar. */
export function attachHelp(platformBar: HTMLElement): void {
  bar = platformBar;

  button = el('button', {
    cls: 'p2e-bar__help',
    attrs: { type: 'button', 'aria-expanded': 'false', 'aria-controls': 'p2e-help' },
  });
  button.append(el('span', { cls: 'p2e-bar__help-mark', text: '?', attrs: { 'aria-hidden': 'true' } }), 'Help');
  button.addEventListener('click', toggle);
  platformBar.append(button);

  heading = el('h2', { cls: 'p2e-help__title', attrs: { id: 'p2e-help-title' } });
  const close_ = el('button', {
    cls: 'p2e-help__close',
    text: '×',
    attrs: { type: 'button', 'aria-label': 'Close help' },
  });
  close_.addEventListener('click', close);
  const head = el('div', { cls: 'p2e-help__head' });
  head.append(heading, close_);

  body = el('div', { cls: 'p2e-help__body' });
  const hint = el('p', { cls: 'p2e-help__hint', text: 'Press ? to open or close help. Esc closes it.' });

  panel = el('aside', {
    cls: 'p2e-help',
    attrs: { id: 'p2e-help', role: 'dialog', 'aria-modal': 'false', 'aria-labelledby': 'p2e-help-title', tabindex: '-1' },
  });
  panel.hidden = true;
  panel.append(head, body, hint);
  document.body.append(panel);

  // Keys pressed while reading help must never reach the tool underneath, or Space could advance a
  // combat. Escape closes the panel, ? is left to bubble so it can toggle, and the browser's own
  // behaviour (scrolling, Tab, activating a button) is untouched because only propagation stops.
  panel.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      close();
      e.stopPropagation();
    } else if (e.key !== '?') {
      e.stopPropagation();
    }
  });

  document.addEventListener('keydown', onKey);
  window.addEventListener('resize', () => {
    if (isOpen()) place();
  });
  render();
}
