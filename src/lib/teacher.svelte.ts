/** The three pages a teacher works through inside one open store. */
export type StorePage = 'prices' | 'coupons' | 'settings'

/** What every teacher screen shares while one store is open. */
export const teacher = $state({
  /** The one-line status message under the header. */
  message: '',
  /** Which aisle the price studio is showing, kept while the teacher switches screens. */
  priceAisleIndex: 0,
  /** The open store as a link-ready string, kept current as the teacher edits. */
  encoded: '',
  /**
   * Which saved store in this browser the open store is, or null when it is
   * not saved. A saved store saves itself again on every change.
   */
  savedId: null as string | null,
})
