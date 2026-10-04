/** The three pages a teacher works through inside one open store, in the side panel's order. */
export type StorePage = 'inventory' | 'coupons' | 'settings'

/** What every teacher screen shares while one store is open. */
export const teacher = $state({
  /** The one-line status message at the top of the page. */
  message: '',
  /** Which aisle the inventory page is showing, kept while the teacher switches pages. */
  inventoryAisleIndex: 0,
  /** Whether the inventory page lists the CG Value products beside the name brands. */
  showStoreBrand: true,
  /** The open store as a link-ready string, kept current as the teacher edits. */
  encoded: '',
  /**
   * `encoded` as it was when the teacher last copied the student link, or ''
   * before they have. When the two differ, the class has an out-of-date link.
   */
  sharedEncoded: '',
  /** Which store on the teacher's list the open store is. It saves itself again on every change. */
  savedId: null as string | null,
})
