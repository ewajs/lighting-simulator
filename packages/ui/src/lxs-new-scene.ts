import { DEFAULT_ROOM, type Scene } from '@luxstudio/core';
import { localized, msg, str } from '@lit/localize';
import { css, html, LitElement, type PropertyValues } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { X } from 'lucide';
import type { RoomTemplate } from './display-catalog';
import { formatNumber } from './format';
import { icon } from './icons';
import { scenePlan } from './scene-plan';
import { sharedStyles } from './styles';

/** Detail of `lxs-template-pick`: the template's name and scene. */
export interface TemplatePickDetail {
  readonly name: string;
  readonly scene: Scene;
}

/** The default room with nothing in it: always offered first. */
const EMPTY_SCENE: Scene = { room: DEFAULT_ROOM, luminaires: [], furniture: [] };

/**
 * New: a modal dialog to start a scene from a template (ADR 0052). An empty
 * room comes first, then the host's templates, each with its picture or
 * floor plan. Esc, ✕ or a click outside closes it.
 *
 * @fires lxs-template-pick - `detail: TemplatePickDetail`; the dialog closes too
 * @fires lxs-new-scene-close - it closed, picked or not
 */
@customElement('lxs-new-scene')
@localized()
export class LxsNewScene extends LitElement {
  static override styles = [
    sharedStyles,
    css`
      dialog {
        width: min(640px, calc(100vw - 2 * var(--lxs-sp-4)));
        max-height: calc(100dvh - 2 * var(--lxs-sp-4));
        padding: var(--lxs-sp-4);
        border: 1px solid var(--lxs-line);
        border-radius: var(--lxs-r-lg);
        background: var(--lxs-surface-1);
        color: var(--lxs-text);
        box-shadow: var(--lxs-shadow);
        font-family: var(--lxs-font-ui);
      }
      dialog::backdrop {
        background: rgb(0 0 0 / 0.5);
      }
      header {
        display: flex;
        align-items: start;
        gap: var(--lxs-sp-2);
        margin-bottom: var(--lxs-sp-3);
      }
      h2 {
        margin: 0;
        font-size: var(--lxs-fs-lg);
      }
      header p {
        margin: var(--lxs-sp-1) 0 0;
        color: var(--lxs-text-muted);
        font-size: var(--lxs-fs-sm);
      }
      header div {
        flex: 1;
      }
      .cards {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
        gap: var(--lxs-sp-3);
      }
      .card {
        display: grid;
        gap: var(--lxs-sp-1);
        padding: var(--lxs-sp-2);
        border: 1px solid var(--lxs-line);
        border-radius: var(--lxs-r-md);
        background: transparent;
        color: var(--lxs-text);
        text-align: left;
        cursor: pointer;
      }
      .card:hover,
      .card:focus-visible {
        border-color: var(--lxs-accent);
      }
      .picture {
        display: block;
        width: 100%;
        aspect-ratio: 4 / 3;
        border-radius: var(--lxs-r-sm);
        background: var(--lxs-viewport-bg);
        object-fit: cover;
      }
      .picture svg {
        display: block;
        width: 100%;
        height: 100%;
      }
      .room {
        fill: var(--lxs-surface-2);
        stroke: var(--lxs-line-strong);
        stroke-width: 2px;
        vector-effect: non-scaling-stroke;
      }
      .piece {
        fill: var(--lxs-surface-3);
        stroke: var(--lxs-text-faint);
        stroke-width: 1px;
        vector-effect: non-scaling-stroke;
      }
      .light {
        fill: var(--lxs-accent);
      }
      .name {
        font-weight: 600;
      }
      .meta {
        color: var(--lxs-text-muted);
        font-size: var(--lxs-fs-xs);
      }
    `,
  ];

  @property({ type: Boolean }) open = false;
  /** The host's templates, after the empty room. */
  @property({ attribute: false }) templates: readonly RoomTemplate[] = [];

  @query('dialog') private dialog!: HTMLDialogElement;

  override render() {
    const empty = { id: 'empty', name: msg('Empty room'), scene: EMPTY_SCENE };
    return html`<dialog
      aria-labelledby="title"
      @close=${this.#onClose}
      @click=${this.#onBackdropClick}
    >
      <header>
        <div>
          <h2 id="title">${msg('New scene')}</h2>
          <p>${msg('Start from a template. Undo brings your current scene back.')}</p>
        </div>
        <button class="icon-btn" type="button" aria-label=${msg('Close')} @click=${this.#close}>
          ${icon(X)}
        </button>
      </header>
      <div class="cards">${[empty, ...this.templates].map((template) => this.#card(template))}</div>
    </dialog>`;
  }

  #card({ name, scene, thumbnailUrl }: RoomTemplate) {
    const { width, depth } = scene.room;
    const size = `${formatNumber(width, 1)} × ${formatNumber(depth, 1)} m`;
    const lights = scene.luminaires.length;
    const pieces = scene.furniture.length;
    const meta =
      lights + pieces === 0 ? size : msg(str`${size} · ${lights} luminaires · ${pieces} pieces`);
    return html`<button class="card" type="button" @click=${() => this.#pick(name, scene)}>
      ${
        thumbnailUrl
          ? html`<img class="picture" src=${thumbnailUrl} alt="" />`
          : html`<span class="picture">${scenePlan(scene)}</span>`
      }
      <span class="name">${name}</span>
      <span class="meta">${meta}</span>
    </button>`;
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (!changed.has('open')) return;
    if (this.open && !this.dialog.open) {
      this.dialog.showModal();
      // The dialog would focus ✕, its first button; the first template is what people want.
      this.renderRoot.querySelector<HTMLButtonElement>('.card')?.focus();
    } else if (!this.open && this.dialog.open) {
      this.dialog.close();
    }
  }

  #pick(name: string, scene: Scene): void {
    this.dispatchEvent(
      new CustomEvent<TemplatePickDetail>('lxs-template-pick', {
        detail: { name, scene },
        bubbles: true,
        composed: true,
      }),
    );
    this.#close();
  }

  #close = (): void => {
    this.dialog.close();
  };

  /** Esc, ✕, a pick and backdrop clicks all end here. */
  #onClose = (): void => {
    this.dispatchEvent(new CustomEvent('lxs-new-scene-close', { bubbles: true, composed: true }));
  };

  /** A click on the dialog element itself, not its content, is on the backdrop. */
  #onBackdropClick = (event: MouseEvent): void => {
    if (event.target === this.dialog) this.#close();
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'lxs-new-scene': LxsNewScene;
  }
  interface HTMLElementEventMap {
    'lxs-template-pick': CustomEvent<TemplatePickDetail>;
    'lxs-new-scene-close': CustomEvent<object>;
  }
}
