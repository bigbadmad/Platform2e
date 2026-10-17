/** Create an element with optional class names, text, HTML and attributes. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  opts: {
    cls?: string | string[];
    text?: string;
    html?: string;
    attrs?: Record<string, string>;
  } = {},
): HTMLElementTagNameMap[K] {
  const elem = document.createElement(tag);
  if (opts.cls) {
    const classes = Array.isArray(opts.cls)
      ? opts.cls.flatMap((c) => c.split(' ').filter(Boolean))
      : opts.cls.split(' ').filter(Boolean);
    elem.classList.add(...classes);
  }
  if (opts.text !== undefined) elem.textContent = opts.text;
  if (opts.html !== undefined) elem.innerHTML = opts.html;
  if (opts.attrs) {
    for (const [k, v] of Object.entries(opts.attrs)) {
      elem.setAttribute(k, v);
    }
  }
  return elem;
}

/** Create a button element. */
export function btn(
  text: string,
  cls: string,
  onClick: (e: MouseEvent) => void,
): HTMLButtonElement {
  const b = el('button', { cls, text });
  b.addEventListener('click', onClick);
  return b;
}

/** Empty a container and put a single child in it. */
export function mount(container: HTMLElement, child: HTMLElement): void {
  container.innerHTML = '';
  container.appendChild(child);
}
