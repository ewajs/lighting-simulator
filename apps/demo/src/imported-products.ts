import { beamAngleDeg, totalFlux, type Product } from '@luxstudio/core';
import type { ImportIesDetail } from '@luxstudio/ui';

/** Display name of an imported product, as shown in the catalog. */
export interface ImportedItem {
  readonly productId: string;
  readonly name: string;
}

/**
 * IES files the visitor loaded during this visit, as products. Kept in memory
 * only: a reload clears them (ADR 0037).
 */
export class ImportedProducts {
  readonly #products = new Map<string, Product>();
  readonly #texts = new Map<string, string>();
  readonly #items: ImportedItem[] = [];

  /** Adds a product for the file and returns its id. Power, flux and beam come from the file. */
  add({ name, mount, cct, text, photometry }: ImportIesDetail): string {
    const id = `imported-${this.#items.length + 1}`;
    this.#products.set(id, {
      id,
      mount,
      cct,
      power: photometry.power,
      flux: totalFlux(photometry),
      beamDeg: beamAngleDeg(photometry),
    });
    this.#texts.set(id, text);
    this.#items.push({ productId: id, name });
    return id;
  }

  get(productId: string): Product | undefined {
    return this.#products.get(productId);
  }

  /** The IES text of an imported product, for the photometry provider. */
  text(productId: string): string | undefined {
    return this.#texts.get(productId);
  }

  get items(): readonly ImportedItem[] {
    return this.#items;
  }
}
