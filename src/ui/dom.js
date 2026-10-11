/**
 * Minimal element factory.
 *   h('button.btn.btn--primary', { onclick, title: 'Save' }, icon('share'), 'Share')
 * Props starting with "on" become listeners, `dataset`/`style` objects are merged,
 * everything else is set as an attribute (or property for value/checked).
 */
export function h(selector, props = {}, ...children) {
  if (props == null || props instanceof Node || typeof props !== 'object' || Array.isArray(props)) {
    children.unshift(props);
    props = {};
  }
  const [tag, ...classes] = selector.split('.');
  const el = document.createElement(tag || 'div');
  if (classes.length) el.className = classes.join(' ');

  for (const [key, value] of Object.entries(props)) {
    if (value == null || value === false) continue;
    if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2), value);
    else if (key === 'dataset') Object.assign(el.dataset, value);
    else if (key === 'style' && typeof value === 'object') Object.assign(el.style, value);
    else if (key === 'class') el.classList.add(...String(value).split(' ').filter(Boolean));
    else if (key === 'value' || key === 'checked') el[key] = value;
    else el.setAttribute(key, value === true ? '' : value);
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : String(child));
  }
}

/** Replace all children of `el`. */
export function replace(el, ...children) {
  el.replaceChildren();
  append(el, children);
  return el;
}

export const fmt = {
  m: (v) => `${v.toFixed(2)} m`,
  lm: (v) => `${Math.round(v).toLocaleString('en-US')} lm`,
  w: (v) => `${+v.toFixed(1)} W`,
  k: (v) => `${Math.round(v)} K`,
  pct: (v) => `${Math.round(v * 100)}%`,
};
