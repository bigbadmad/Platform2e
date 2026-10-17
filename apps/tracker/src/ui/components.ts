// Shared DOM helpers used across all screens.
import { el } from '@platform2e/ui/dom';

// el, btn and mount live in the shared package; re-exported so screens keep one import.
export { el, btn, mount } from '@platform2e/ui/dom';

/** Create a labeled text/number input. */
export function labeledInput(opts: {
  label: string;
  id: string;
  type: string;
  value?: string;
  min?: string;
  max?: string;
  placeholder?: string;
  cls?: string;
}): HTMLDivElement {
  const wrap = el('div', { cls: ['form-group', opts.cls ?? ''].join(' ').trim() });
  const lbl = el('label', { text: opts.label, attrs: { for: opts.id } });
  const inp = el('input', {
    attrs: {
      type: opts.type,
      id: opts.id,
      name: opts.id,
      ...(opts.value !== undefined ? { value: opts.value } : {}),
      ...(opts.min !== undefined ? { min: opts.min } : {}),
      ...(opts.max !== undefined ? { max: opts.max } : {}),
      ...(opts.placeholder !== undefined ? { placeholder: opts.placeholder } : {}),
    },
  });
  wrap.append(lbl, inp);
  return wrap;
}

/** Render a small chip badge. */
export function chip(text: string, extraCls = ''): HTMLSpanElement {
  return el('span', { cls: ['chip', extraCls].join(' ').trim(), text });
}

/** Generate a short unique ID. */
export function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

/** Clamp a number between min and max. */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Format a modifier value with sign for display. */
export function fmtSign(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

/** Create a Font Awesome icon element (aria-hidden — purely decorative). */
export function faIcon(cls: string): HTMLElement {
  const i = document.createElement('i');
  i.className = cls;
  i.setAttribute('aria-hidden', 'true');
  return i;
}

/**
 * Create a button with a Font Awesome icon.
 * Pass an empty `label` for icon-only buttons; supply `ariaLabel` for accessibility.
 */
export function iconBtn(
  iconCls: string,
  label: string,
  cls: string,
  onClick: (e: MouseEvent) => void,
  ariaLabel?: string,
): HTMLButtonElement {
  const b = el('button', { cls });
  b.appendChild(faIcon(iconCls));
  if (label) b.appendChild(document.createTextNode(' ' + label));
  if (ariaLabel) b.setAttribute('aria-label', ariaLabel);
  b.addEventListener('click', onClick);
  return b;
}
