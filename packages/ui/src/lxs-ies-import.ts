import { parseIes, type MountType, type Photometry } from '@luxstudio/core';
import { localized, msg, str } from '@lit/localize';
import { css, html, LitElement } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { FileUp } from 'lucide';
import type { FieldChange } from './field-change';
import { DEFAULT_IMPORT_CCT, importedCct, importedName, suggestedMount } from './ies-import';
import { icon } from './icons';
import { mountLabel } from './labels';
import './lxs-number-field';
import { sharedStyles } from './styles';

/** IES files are ASCII or Latin-1, never reliably UTF-8. */
const IES_ENCODING = 'latin1';
const MOUNT_TYPES: readonly MountType[] = [
  'recessed',
  'pendant',
  'track',
  'wall',
  'floor',
  'table',
];
const MIN_CCT = 1000;
const MAX_CCT = 10000;
const CCT_STEP = 100;

/** Detail of `lxs-import-ies`: a checked IES file and how the user wants it as a product. */
export interface ImportIesDetail {
  readonly name: string;
  readonly mount: MountType;
  /** Nominal colour temperature in K. */
  readonly cct: number;
  readonly fileName: string;
  /** The file's text, e.g. for the host's PhotometryProvider. */
  readonly text: string;
  /** The parsed file, for flux, beam angle and power. */
  readonly photometry: Photometry;
}

/**
 * Lets the user try their own IES file: pick or drop one, check the
 * suggested name, mount type and colour temperature, and confirm. The file is
 * validated here; adding the product is up to the host (ADR 0037).
 *
 * @fires lxs-import-ies - `detail: ImportIesDetail`
 */
@customElement('lxs-ies-import')
@localized()
export class LxsIesImport extends LitElement {
  static override styles = [
    sharedStyles,
    css`
      :host {
        display: block;
        padding: var(--lxs-sp-3);
        border-top: 1px solid var(--lxs-line);
      }
      .drop {
        display: grid;
        justify-items: center;
        gap: var(--lxs-sp-1);
        padding: var(--lxs-sp-3);
        border: 1px dashed var(--lxs-line-strong);
        border-radius: var(--lxs-r-md);
        color: var(--lxs-text-muted);
        font-size: var(--lxs-fs-xs);
        text-align: center;
      }
      .drop[data-over] {
        border-color: var(--lxs-accent);
        background: var(--lxs-accent-soft);
      }
      .error {
        margin: var(--lxs-sp-2) 0 0;
        color: var(--lxs-danger);
        font-size: var(--lxs-fs-xs);
        overflow-wrap: anywhere;
      }
      form {
        display: grid;
        gap: var(--lxs-sp-3);
      }
      .file {
        color: var(--lxs-text-faint);
        font-size: var(--lxs-fs-xs);
        overflow-wrap: anywhere;
      }
      label {
        display: grid;
        gap: 6px;
        color: var(--lxs-text-muted);
        font-size: var(--lxs-fs-xs);
      }
      input,
      select {
        min-width: 0;
        height: var(--lxs-control-h);
        padding: 0 var(--lxs-sp-2);
        border: 1px solid var(--lxs-line);
        border-radius: var(--lxs-r-md);
        background: var(--lxs-surface-2);
        color: var(--lxs-text);
        font: inherit;
        font-size: var(--lxs-fs-sm);
      }
      input:focus,
      select:focus {
        border-color: var(--lxs-accent);
        outline: none;
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: var(--lxs-sp-2);
      }
      .actions .btn {
        white-space: nowrap;
      }
      .primary {
        border-color: transparent;
        background: var(--lxs-accent);
        color: var(--lxs-on-accent);
      }
      .primary:hover {
        background: var(--lxs-accent-hover);
      }
      input[type='file'] {
        display: none;
      }
    `,
  ];

  @state() private draft: ImportIesDetail | undefined;
  @state() private error: string | undefined;
  @state() private over = false;

  override render() {
    return this.draft ? this.#form(this.draft) : this.#dropZone();
  }

  #dropZone() {
    return html`<div
        class="drop"
        ?data-over=${this.over}
        @dragover=${this.#onDragOver}
        @dragleave=${() => (this.over = false)}
        @drop=${this.#onDrop}
      >
        <span>${msg('Try your own IES file: drop it here or')}</span>
        <button class="btn" type="button" @click=${this.#browse}>
          ${icon(FileUp)} ${msg('Load IES file…')}
        </button>
        <input
          type="file"
          accept=".ies,.IES"
          aria-label=${msg('IES file')}
          @change=${this.#onFileInput}
        />
      </div>
      ${this.error ? html`<p class="error" role="alert">${this.error}</p>` : ''}`;
  }

  #form(draft: ImportIesDetail) {
    return html`<form @submit=${this.#confirm}>
      <div class="file">${msg(str`File: ${draft.fileName}`)}</div>
      <label>
        ${msg('Name')}
        <input
          .value=${draft.name}
          required
          @input=${(event: Event) =>
            this.#update({ name: (event.target as HTMLInputElement).value })}
        />
      </label>
      <label>
        ${msg('Mount type')}
        <select
          @change=${(event: Event) =>
            this.#update({ mount: (event.target as HTMLSelectElement).value as MountType })}
        >
          ${MOUNT_TYPES.map(
            (mount) =>
              html`<option value=${mount} ?selected=${draft.mount === mount}>
                ${mountLabel(mount)}
              </option>`,
          )}
        </select>
      </label>
      <lxs-number-field
        label=${msg('Colour temperature')}
        unit="K"
        .value=${draft.cct}
        .min=${MIN_CCT}
        .max=${MAX_CCT}
        .step=${CCT_STEP}
        .decimals=${0}
        @lxs-change=${(event: CustomEvent<FieldChange>) => this.#update({ cct: event.detail.value })}
      ></lxs-number-field>
      <div class="actions">
        <button class="btn" type="button" @click=${() => (this.draft = undefined)}>
          ${msg('Cancel')}
        </button>
        <button class="btn primary" type="submit">${msg('Add to catalog')}</button>
      </div>
    </form>`;
  }

  #browse(): void {
    this.renderRoot.querySelector<HTMLInputElement>('input[type="file"]')?.click();
  }

  #onFileInput = (event: Event): void => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // Picking the same file again should still fire.
    if (file) void this.#read(file);
  };

  #onDragOver = (event: DragEvent): void => {
    if (!event.dataTransfer?.types.includes('Files')) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    this.over = true;
  };

  #onDrop = (event: DragEvent): void => {
    event.preventDefault();
    this.over = false;
    const file = event.dataTransfer?.files[0];
    if (file) void this.#read(file);
  };

  async #read(file: File): Promise<void> {
    const text = new TextDecoder(IES_ENCODING).decode(await file.arrayBuffer());
    try {
      const photometry = parseIes(text);
      const { keywords } = photometry;
      this.error = undefined;
      this.draft = {
        name: importedName(keywords, file.name),
        mount: suggestedMount(photometry),
        cct: importedCct(keywords) ?? DEFAULT_IMPORT_CCT,
        fileName: file.name,
        text,
        photometry,
      };
    } catch (error) {
      // The parser's detail is English and technical; the lead-in is translated.
      const detail = error instanceof Error ? error.message : String(error);
      this.error = `${msg(str`Couldn't read ${file.name}.`)} ${detail}`;
    }
  }

  #update(change: Partial<ImportIesDetail>): void {
    if (this.draft) this.draft = { ...this.draft, ...change };
  }

  #confirm = (event: SubmitEvent): void => {
    event.preventDefault();
    const draft = this.draft;
    if (!draft || draft.name.trim() === '') return;
    this.dispatchEvent(
      new CustomEvent<ImportIesDetail>('lxs-import-ies', {
        detail: { ...draft, name: draft.name.trim() },
        bubbles: true,
        composed: true,
      }),
    );
    this.draft = undefined;
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'lxs-ies-import': LxsIesImport;
  }
  interface HTMLElementEventMap {
    'lxs-import-ies': CustomEvent<ImportIesDetail>;
  }
}
