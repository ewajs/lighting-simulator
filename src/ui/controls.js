import { h } from './dom.js';
import { icon } from './icons.js';

/**
 * Small stateful form controls. Each returns `{ el, set(value) }` so a panel
 * can push store updates into it without rebuilding DOM (and without stealing
 * focus from a field the user is typing in).
 */

/** Numeric input with unit suffix. ↑/↓ step, Shift×10. Commits on Enter/blur. */
export function numberField({ label, value, unit, step = 0.1, min = -Infinity, max = Infinity, decimals = 2, onChange }) {
  const clamp = (v) => Math.min(max, Math.max(min, v));
  const show = (v) => (input.value = Number(v).toFixed(decimals));
  const input = h('input', {
    type: 'text', inputmode: 'decimal', 'aria-label': label, spellcheck: 'false',
    onkeydown(e) {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const next = clamp((parseFloat(input.value) || 0) + (e.key === 'ArrowUp' ? 1 : -1) * step * (e.shiftKey ? 10 : 1));
        show(next);
        onChange(next);
      } else if (e.key === 'Enter') input.blur();
      else if (e.key === 'Escape') { show(current); input.blur(); }
    },
    onchange() {
      const v = parseFloat(input.value.replace(',', '.'));
      if (Number.isFinite(v)) onChange(clamp(v));
      show(Number.isFinite(v) ? clamp(v) : current);
    },
    onfocus: () => input.select(),
  });
  let current = value;
  show(value);
  const el = h('label.field', h('span.field__label', label), h('span.input', input, unit && h('span.input__unit', unit)));
  return {
    el,
    set(v) {
      current = v;
      if (document.activeElement !== input) show(v);
    },
  };
}

/** Range slider with a live value readout in the label row. */
export function sliderField({ label, value, min = 0, max = 1, step = 0.01, format = String, variant, onChange }) {
  const readout = h('span.field__value');
  const input = h(`input.slider${variant ? `.slider--${variant}` : ''}`, {
    type: 'range', min, max, step, 'aria-label': label,
    oninput: () => { paint(); onChange(+input.value); },
  });
  const paint = () => {
    readout.textContent = format(+input.value);
    input.style.setProperty('--pct', `${((input.value - min) / (max - min)) * 100}%`);
  };
  const el = h('div.field', h('span.field__label', h('span', label), readout), input);
  const set = (v) => { input.value = v; paint(); };
  set(value);
  return { el, set };
}

/** Select dropdown. options: [{ value, label }] */
export function selectField({ label, value, options, onChange }) {
  const select = h('select', { 'aria-label': label, onchange: () => onChange(select.value) },
    options.map((o) => h('option', { value: o.value }, o.label)));
  select.value = value;
  const el = h('label.field', h('span.field__label', label), h('span.input', select, h('span.input__unit', icon('chevronDown', { size: 12 }))));
  return { el, set: (v) => (select.value = v) };
}

/**
 * Segmented control (radio group). options: [{ value, label, icon?, disabled?, title? }]
 * Arrow keys move the selection, per the ARIA radiogroup pattern.
 */
export function segmented({ options, value, onChange, label, className = '' }) {
  const buttons = options.map((o) =>
    h('button', {
      type: 'button', role: 'radio', title: o.title, disabled: o.disabled,
      dataset: { value: o.value },
      onclick: () => onChange(o.value),
    }, o.icon && icon(o.icon), o.label));
  const el = h(`div.segmented${className ? `.${className}` : ''}`, {
    role: 'radiogroup', 'aria-label': label,
    onkeydown(e) {
      if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      const enabled = buttons.filter((b) => !b.disabled);
      const i = enabled.indexOf(document.activeElement);
      const next = enabled[(i + (e.key === 'ArrowRight' ? 1 : -1) + enabled.length) % enabled.length];
      next.focus();
      onChange(next.dataset.value);
    },
  }, buttons);
  const set = (v) => buttons.forEach((b) => {
    const on = b.dataset.value === v;
    b.setAttribute('aria-checked', on);
    b.tabIndex = on ? 0 : -1;
  });
  set(value);
  return { el, set };
}

/** Collapsible panel section. */
export function section(title, children, { open = true } = {}) {
  const body = h('div.section__body', children);
  const el = h('section.section', { dataset: { open } },
    h('button.section__head', {
      type: 'button', 'aria-expanded': open,
      onclick(e) {
        const next = el.dataset.open !== 'true';
        el.dataset.open = next;
        e.currentTarget.setAttribute('aria-expanded', next);
      },
    }, title, icon('chevronDown')),
    body);
  return el;
}

export function iconButton(name, label, props = {}) {
  return h('button.icon-btn', { type: 'button', 'aria-label': label, title: label, ...props }, icon(name));
}

export function emptyState(iconName, text, action) {
  return h('div.empty', icon(iconName), h('p', text), action);
}

let toastEl, toastTimer;
export function toast(message) {
  toastEl ??= document.body.appendChild(h('div.toast.glass', { role: 'status', 'aria-live': 'polite' }));
  toastEl.textContent = message;
  toastEl.dataset.show = 'true';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toastEl.dataset.show = 'false'), 1800);
}
