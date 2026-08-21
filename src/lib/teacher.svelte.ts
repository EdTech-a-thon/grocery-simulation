import { listStores, type Store } from './pocketbase'

/** The three pages a teacher works through inside one open store. */
export type StorePage = 'prices' | 'coupons' | 'settings'

/**
 * What every teacher screen shares: their stores, the one-line status message
 * under the header, and whether a save is in flight.
 */
export const teacher = $state({
  stores: [] as Store[],
  message: '',
  busy: false,
  /** Which aisle the price studio is showing, kept while the teacher switches screens. */
  priceAisleIndex: 0,
})

export async function refreshStores() {
  teacher.stores = await listStores()
}

/** Runs one save at a time, so a double click cannot create two stores. */
export async function withBusy(work: () => Promise<void>) {
  if (teacher.busy) return
  teacher.busy = true
  try {
    await work()
  } finally {
    teacher.busy = false
  }
}
