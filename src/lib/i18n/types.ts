/**
 * The shape every language file fills in. English (en.ts) is the canonical one:
 * it is written first, and every other language is a copy of it with the
 * right-hand side translated. The keys never change, because the rest of the
 * app looks strings up by key.
 */
export type LanguagePack = {
  /** What this language calls itself, for the picker. */
  name: string
  /** Text direction of the whole page: 'ltr' for all three languages today. */
  dir: 'ltr' | 'rtl'
  /** The BCP 47 tag that goes on <html lang>, so screen readers read it right. */
  locale: string

  /** Every fixed piece of interface text, by key. */
  ui: Record<string, string>

  /** Aisle names, keyed by the English title in the aisle's JSON file. */
  aisles: Record<string, string>

  /**
   * Product names and shelf notes, keyed by product id. Only the name brands
   * are listed: a CG Value twin is the same word with the brand in front of it,
   * which productName() adds.
   */
  products: Record<string, { name: string; note: string }>
}
