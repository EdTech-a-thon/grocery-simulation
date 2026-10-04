import { test, expect, type Page } from '@playwright/test'

// There are no accounts: a store lives in its own link. The first test builds
// one and keeps the teacher's address, and the rest open that address — or the
// student link made from it — exactly as a bookmark or a shared link would.

const store = { name: 'Room 204 Market' }
let teacherUrl = ''

/** The link students are given: the same store, on the student route. */
function studentUrl() {
  return teacherUrl.replace('/teacher#', '/shop#')
}

/**
 * The store as it stands in the page's address, in its packed form (see
 * packStore in src/lib/store.ts). This is what students would receive.
 */
type PackedStore = {
  n: string
  c?: string
  b?: string
  u?: string
  t?: number
  x?: 1
  p?: Record<string, number>
  s?: Record<string, 0 | 1>
  z?: Record<string, [number, string]>
  q?: Array<[string, 'p' | 'd', number, string]>
}

async function readStore(page: Page): Promise<PackedStore> {
  return page.evaluate(async () => {
    const text = location.hash.slice(1)
    const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'))
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
    return JSON.parse(await new Response(stream).text())
  })
}

async function openTeacherPage(page: Page) {
  await page.goto(teacherUrl)
  await expect(page.getByRole('heading', { name: 'Prices and stock' })).toBeVisible()
}

/** Brands on the shelves are a store setting, so switching lines goes through that page. */
async function setBrandMode(page: Page, label: string) {
  await page.getByRole('button', { name: 'Store settings' }).click()
  await page.getByLabel(label).check()
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.locator('.status-message')).toContainText('updated.')
}

/** Opens the store the way a student does: by following the link. */
async function openAsStudent(page: Page, link = studentUrl()) {
  await page.goto(link)
  await expect(page.getByRole('heading', { name: /Grocery Store/ })).toBeVisible()
  await page.getByRole('button', { name: 'Enter the store' }).click()
  await expect(page.locator('.shelf-stage')).toBeVisible()
}

async function goToAisle(page: Page, title: string) {
  for (let attempt = 0; attempt < 14; attempt++) {
    if ((await page.locator('.shelf-topline h2').innerText()).includes(title)) return
    await page.getByRole('button', { name: 'Next aisle' }).click()
  }
  throw new Error(`Never reached the ${title} aisle`)
}

async function visibleAisleTitles(page: Page) {
  const titles: string[] = []
  const first = (await page.locator('.shelf-topline h2').innerText()).trim()
  titles.push(first)
  for (let index = 0; index < 15; index++) {
    await page.getByRole('button', { name: 'Next aisle' }).click()
    const title = (await page.locator('.shelf-topline h2').innerText()).trim()
    if (title === first) break
    titles.push(title)
  }
  return titles
}

/** The student link for the store a teacher page has open right now. */
function studentLinkFrom(page: Page) {
  return page.url().replace('/teacher#', '/shop#')
}

test.describe.configure({ mode: 'serial' })

test('a teacher builds a store without signing up for anything', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Teachers: set up a store, no account needed' }).click()
  await expect(page).toHaveURL(/\/teacher$/)
  await expect(page.locator('.store-list')).toContainText('Create your first store to get started.')

  await page.getByRole('button', { name: 'Create New Store' }).click()
  await page.getByLabel('Store name').fill(store.name)
  await page.getByLabel('Store color').selectOption('blue')
  await page.getByRole('button', { name: 'Create store' }).click()
  await expect(page.getByRole('heading', { name: 'Prices and stock' })).toBeVisible()

  await page.getByRole('button', { name: 'Dairy and Eggs' }).click()
  await page.getByLabel('Price for Milk').fill('9.99')
  await page.getByLabel('Price for Milk').blur()
  await page.getByLabel('Stock Cottage Cheese in this store').uncheck()
  await expect(page.locator('.price-edit-card', { has: page.getByLabel('Stock Cottage Cheese in this store') })).toHaveClass(/price-edit-card-hidden/)

  // Empty one whole aisle, which should drop out of the shopper's view entirely.
  await page.getByRole('button', { name: 'Seafood' }).click()
  await page.getByRole('button', { name: 'Stock none' }).click()
  await expect(page.locator('.status-message')).toHaveText('Seafood taken off the shelves.')

  await page.getByRole('button', { name: 'Coupons' }).click()
  await page.getByLabel('Applies to').selectOption('milk')
  await page.locator('[data-discount-amount]').fill('10')
  await page.getByLabel('Coupon code word').fill('MILK DAY')
  await page.getByRole('button', { name: 'Create coupon' }).click()

  // A dollars coupon worth far more than the item it applies to.
  await page.getByLabel('Discount type').selectOption('dollars')
  await page.locator('[data-discount-amount]').fill('50')
  await page.getByLabel('Applies to').selectOption('apple')
  await page.getByLabel('Coupon code word').fill('APPLE50')
  await page.getByRole('button', { name: 'Create coupon' }).click()
  await expect(page.getByText('2 ready to use')).toBeVisible()

  // A code the store already has is refused, so two coupons never share one.
  await page.getByLabel('Coupon code word').fill('apple50')
  await page.getByRole('button', { name: 'Create coupon' }).click()
  await expect(page.locator('.status-message')).toHaveText('This store already has a coupon with the code APPLE50.')
  await expect(page.getByText('2 ready to use')).toBeVisible()

  // Every change is in the address, so the page is a bookmark of the store.
  await expect.poll(() => readStore(page)).toMatchObject({
    n: store.name,
    c: 'blue',
    p: { milk: 9.99 },
    s: { 'cottage-cheese': 0, salmon: 0 },
    q: [['MILK DAY', 'p', 10, 'milk'], ['APPLE50', 'd', 50, 'apple']],
  })
  teacherUrl = page.url()
})

test('the teacher page reopens from its address, like a bookmark', async ({ page }) => {
  await openTeacherPage(page)
  await expect(page.locator('.teacher-hero h2')).toHaveText(store.name)
  await page.getByRole('button', { name: 'Dairy and Eggs' }).click()
  await expect(page.getByLabel('Price for Milk')).toHaveValue('9.99')
  await expect(page.locator('.keep-store-note')).toContainText('Bookmark this page')
})

test('leaving a store that is not saved anywhere asks first', async ({ page }) => {
  await openTeacherPage(page)

  page.once('dialog', (dialog) => dialog.dismiss())
  await page.getByRole('button', { name: 'My stores' }).click()
  await expect(page.getByRole('heading', { name: 'Prices and stock' })).toBeVisible()

  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'My stores' }).click()
  await expect(page.locator('.store-list')).toContainText('0 stores')
  await expect(page).toHaveURL(/\/teacher$/)
})

test('a store saved in this browser is listed, kept up to date, duplicated and removed', async ({ page }) => {
  await openTeacherPage(page)
  await page.getByRole('button', { name: 'Save in this browser' }).click()
  await expect(page.locator('.saved-here-badge')).toHaveText('Saved in this browser')

  // A saved store saves itself again on every change.
  await page.getByRole('button', { name: 'Dairy and Eggs' }).click()
  await page.getByLabel('Price for Milk').fill('4.25')
  await page.getByLabel('Price for Milk').blur()
  await expect.poll(async () => (await readStore(page)).p?.milk).toBe(4.25)

  // Nothing is unsaved, so leaving does not ask.
  await page.getByRole('button', { name: 'My stores' }).click()
  await expect(page.locator('.store-list')).toContainText('1 store')

  await page.reload()
  const card = page.locator('.store-summary').filter({ hasText: store.name })
  await expect(card).toHaveCount(1)
  await card.getByRole('button', { name: 'Edit Store' }).click()
  await page.getByRole('button', { name: 'Dairy and Eggs' }).click()
  await expect(page.getByLabel('Price for Milk')).toHaveValue('4.25')
  await page.getByRole('button', { name: 'My stores' }).click()

  page.once('dialog', (dialog) => dialog.accept(`${store.name} Period 4`))
  await card.getByRole('button', { name: 'Duplicate' }).click()
  await expect(page.locator('.store-list')).toContainText('2 stores')
  await expect(page.locator('.store-summary').filter({ hasText: `${store.name} Period 4` })).toHaveCount(1)

  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: `Delete ${store.name} Period 4` }).click()
  await expect(page.locator('.store-list')).toContainText('1 store')
})

test('an emptied aisle disappears from the student view', async ({ page }) => {
  await openTeacherPage(page)
  await page.getByRole('button', { name: 'View as Student' }).click()

  const titles = await visibleAisleTitles(page)
  expect(titles.some((title) => title.includes('Seafood'))).toBe(false)
  expect(titles.some((title) => title.includes('Dairy and Eggs'))).toBe(true)
})

test('viewing as a student swaps the header for the Student View banner', async ({ page }) => {
  await openTeacherPage(page)
  await page.getByRole('button', { name: 'View as Student' }).click()

  const banner = page.locator('.student-view-header')
  await expect(banner).toBeVisible()
  await expect(banner.getByRole('heading')).toHaveText('Student View')
  await expect(banner.getByRole('button')).toHaveCount(1)
  await expect(page.locator('.app-header')).toHaveCount(0)
  await expect(page.locator('.shelf-stage')).toBeVisible()

  await banner.getByRole('button', { name: 'Exit student view' }).click()
  await expect(page.getByRole('heading', { name: 'Prices and stock' })).toBeVisible()
  await expect(page.locator('.app-header')).toBeVisible()
  await expect(page.locator('.student-view-header')).toHaveCount(0)
})

test('a student opens the link and sees only what the store stocks', async ({ page }) => {
  await openAsStudent(page)
  await expect(page.locator('.app-header')).toBeVisible()
  await expect(page.locator('.student-view-header')).toHaveCount(0)
  await expect(page.locator('.class-status')).toContainText(store.name)

  await goToAisle(page, 'Dairy and Eggs')
  await expect(page.getByRole('button', { name: /Add Milk for \$9\.99/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Add Cottage Cheese/ })).toHaveCount(0)
})

test('a student comes back to the same store on a later visit', async ({ page }) => {
  await openAsStudent(page)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: new RegExp(store.name) })).toBeVisible()

  // The welcome screen offers the way back in too.
  await page.getByRole('button', { name: 'Enter the store' }).click()
  await page.getByRole('button', { name: 'Switch role' }).click()
  await page.getByRole('button', { name: `Back to ${store.name}` }).click()
  await expect(page.getByRole('button', { name: 'Enter the store' })).toBeVisible()
})

test('a damaged link explains itself', async ({ page }) => {
  await page.goto('/shop#not-a-store')
  await expect(page.getByRole('heading', { name: 'That store link did not work' })).toBeVisible()

  await page.goto('/teacher#not-a-store')
  await expect(page.locator('.status-message')).toHaveText('That store link did not work. It may have been cut short when it was copied.')
})

test('the receipt itemizes the cart and caps a dollar coupon at the item price', async ({ page }) => {
  page.on('dialog', (dialog) => dialog.accept())

  await openAsStudent(page)
  await goToAisle(page, 'Produce')
  await page.locator('.shelf-product-card', { hasText: 'Apple' }).first().getByRole('button', { name: /^Add Apple for/ }).click()
  await page.locator('.shelf-product-card', { hasText: 'Apple' }).first().getByRole('button', { name: 'Add one more Apple' }).click()

  await page.getByRole('button', { name: 'Check out' }).click()
  const receipt = page.locator('.receipt')
  await expect(receipt.locator('.receipt-item-name', { hasText: 'Apple' })).toBeVisible()
  await expect(receipt.locator('.receipt-item-count')).toContainText('2 ×')
  await expect(receipt.locator('.receipt-item').filter({ hasText: 'Apple' }).locator('strong').first()).toHaveText('$1.78')

  await page.getByRole('button', { name: 'Close' }).click()
  await page.getByRole('button', { name: 'Apply Coupon' }).click()
  await page.getByLabel('Coupon code').fill('APPLE50')
  await page.getByRole('button', { name: 'Apply code', exact: true }).click()

  await page.getByRole('button', { name: 'Close' }).click()
  const discountedCartLine = page.locator('.cart-line').filter({ hasText: 'Apple' })
  await expect(discountedCartLine.locator('.cart-line-coupon')).toContainText('APPLE50')
  await expect(discountedCartLine.locator('.cart-line-coupon')).toContainText('-$1.78')
  await expect(discountedCartLine.locator('.cart-line-total strong')).toHaveText('$0.00')
  await expect(page.locator('.cart-savings strong')).toHaveText('-$1.78')
  await expect(page.locator('.cart-total strong')).toHaveText('$0.00')
  await page.getByRole('button', { name: 'Check out' }).click()

  // $1.78 of apples, so a $50 coupon is capped at $1.78 and nothing goes negative.
  await expect(receipt.locator('.receipt-item-coupon')).toContainText(`-$1.78`)
  await expect(receipt.locator('.receipt-item-coupon')).toContainText('APPLE50')
  await expect(receipt.locator('.receipt-final strong')).toHaveText('$0.00')
  await expect(receipt.locator('.coupon-total strong')).toHaveText('$1.78')
})

test('the receipt prints with its items, coupons and total saved', async ({ page }) => {
  page.on('dialog', (dialog) => dialog.accept())

  await openAsStudent(page)
  await goToAisle(page, 'Produce')
  await page.locator('.shelf-product-card', { hasText: 'Apple' }).first().getByRole('button', { name: /^Add Apple for/ }).click()
  await page.getByRole('button', { name: 'Apply Coupon' }).click()
  await page.getByLabel('Coupon code').fill('APPLE50')
  await page.getByRole('button', { name: 'Apply code', exact: true }).click()

  await page.getByRole('button', { name: 'Close' }).click()
  await page.getByRole('button', { name: 'Check out' }).click()
  await page.getByRole('button', { name: 'Print' }).click()

  const printed = page.locator('.print-receipt')
  await expect(printed.getByText('CLASSGROCERY', { exact: true })).toBeVisible()
  await expect(printed.locator('.receipt-item-name', { hasText: 'Apple' })).toBeVisible()
  await expect(printed.locator('.receipt-item-coupon')).toContainText('APPLE50')
  await expect(printed.getByText('Total Amount Saved Today')).toBeVisible()

  await page.getByRole('button', { name: 'Back' }).click()
  await expect(page.locator('.receipt')).toBeVisible()
})

// ------------------------------------------------------- name brands vs CG

test('stocking both brands puts the CG line on the shelves, priced off this store', async ({ page }) => {
  await openTeacherPage(page)
  await setBrandMode(page, 'Both')
  await expect.poll(async () => (await readStore(page)).b).toBe('both')

  await openAsStudent(page, studentLinkFrom(page))
  await goToAisle(page, 'Dairy and Eggs')
  // 15% under the catalog's $1.59 is $1.3515, snapped to the nearest price
  // ending in 9 cents.
  await expect(page.getByRole('button', { name: /^Add Eggs for \$1\.59/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Add CG Eggs for \$1\.39/ })).toBeVisible()
  // Milk is $9.99 in this store, and its CG twin follows that price.
  await expect(page.getByRole('button', { name: /^Add CG Milk for \$8\.49/ })).toBeVisible()
})

// Every product has a package size, so a cheaper sticker is not always the
// better buy. The teacher can change a size, and choose how much of the unit
// price arithmetic the shelf tag does for the class.
test('a teacher changes a package size, and students compare unit prices', async ({ page, browser }) => {
  /** A student's own browser, opening the store's current link. */
  async function studentInDairy() {
    const student = await (await browser.newContext({ baseURL: test.info().project.use.baseURL })).newPage()
    await openAsStudent(student, studentLinkFrom(page))
    await goToAisle(student, 'Dairy and Eggs')
    return student
  }

  await openTeacherPage(page)
  await setBrandMode(page, 'Both')
  await page.getByRole('button', { name: 'Prices and stock' }).click()
  await page.getByRole('button', { name: 'Dairy and Eggs' }).click()
  await expect(page.getByLabel('Package size for CG Eggs')).toHaveValue('12')
  await page.getByLabel('Package size for CG Eggs').fill('6')
  await page.getByLabel('Package size for CG Eggs').blur()
  await expect.poll(() => readStore(page)).toMatchObject({ b: 'both', z: { 'eggs-cg': [6, 'ct'] } })
  expect((await readStore(page)).u).toBeUndefined()

  // Half the eggs for $0.20 less: cheaper on the sticker, dearer per egg.
  const student = await studentInDairy()
  await expect(student.getByRole('button', { name: 'Add Eggs for $1.59, 12 ct, $0.133 each' })).toBeVisible()
  await expect(student.getByRole('button', { name: 'Add CG Eggs for $1.39, 6 ct, $0.232 each' })).toBeVisible()
  await student.close()

  // Sizes only: the class works the unit price out for itself.
  await page.getByRole('button', { name: 'Store settings' }).click()
  await page.getByLabel('Price and size — students work out the unit price').check()
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.locator('.status-message')).toContainText('updated.')
  await expect.poll(async () => (await readStore(page)).u).toBe('size')
  const sizesOnly = await studentInDairy()
  await expect(sizesOnly.getByRole('button', { name: 'Add CG Eggs for $1.39, 6 ct', exact: true })).toBeVisible()
  await expect(sizesOnly.locator('.price-tag-unit')).toHaveCount(0)
  await sizesOnly.close()

  // Clearing the size goes back to the usual dozen.
  await page.getByRole('button', { name: 'Prices and stock' }).click()
  await page.getByRole('button', { name: 'Dairy and Eggs' }).click()
  await page.getByLabel('Package size for CG Eggs').fill('')
  await page.getByLabel('Package size for CG Eggs').blur()
  await expect(page.getByLabel('Package size for CG Eggs')).toHaveValue('12')
  await expect.poll(async () => (await readStore(page)).z).toBeUndefined()
})

test('stocking only the CG line puts the name brands away but keeps loose food', async ({ page }) => {
  await openTeacherPage(page)
  await setBrandMode(page, 'CG Value store brand')
  await expect.poll(async () => (await readStore(page)).b).toBe('store')

  await openAsStudent(page, studentLinkFrom(page))
  await goToAisle(page, 'Dairy and Eggs')
  await expect(page.getByRole('button', { name: /^Add CG Eggs for/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Add Eggs for/ })).toHaveCount(0)
  // Fruit has no CG twin, so a CG-only store still sells it.
  await goToAisle(page, 'Produce')
  await expect(page.getByRole('button', { name: /^Add Apple for/ })).toBeVisible()
})

// --------------------------------------------------- settings after the fact
//
// The create form and the Edit form are the same form: what a teacher chooses
// when a store is built can be chosen again at any point afterwards.

test('a teacher changes a store settings after it is built', async ({ page }) => {
  await page.goto('/teacher')
  await page.getByRole('button', { name: 'Create New Store' }).click()
  const form = page.locator('.store-modal')
  await form.getByLabel('Store name').fill('Settings Store')
  await form.getByLabel('CG Value store brand').check()
  await form.getByLabel('Use sales tax').check()
  await form.getByLabel('Default sales tax (%)').fill('8.25')
  await form.getByLabel('No coupons').check()
  await page.getByRole('button', { name: 'Create store' }).click()
  await expect(page.getByRole('heading', { name: 'Prices and stock' })).toBeVisible()

  // Coupons are off, so the teacher is not offered the coupon workshop at all.
  await expect(page.getByRole('button', { name: 'Coupons' })).toHaveCount(0)
  await expect.poll(() => readStore(page)).toMatchObject({ n: 'Settings Store', b: 'store', t: 8.25, x: 1 })

  // A hand-stocked product is forgotten when the brand line changes.
  await page.getByRole('button', { name: 'Dairy and Eggs' }).click()
  await page.getByLabel('Stock CG Eggs in this store').uncheck()
  await expect.poll(async () => (await readStore(page)).s).toEqual({ 'eggs-cg': 0 })

  await page.getByRole('button', { name: 'Store settings' }).click()
  const settingsPage = page.locator('.store-settings-workspace')
  await expect(settingsPage.getByRole('heading', { name: 'Edit Settings Store' })).toBeVisible()
  await expect(settingsPage.getByLabel('Default sales tax (%)')).toHaveValue('8.25')
  await settingsPage.getByLabel('Name brands').check()
  await settingsPage.getByLabel('No sales tax').check()
  await settingsPage.getByLabel('Allow coupons').check()
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.locator('.status-message')).toContainText('Settings Store updated.')

  await expect.poll(async () => {
    const packed = await readStore(page)
    return { b: packed.b, t: packed.t, x: packed.x, s: packed.s }
  }).toEqual({ b: undefined, t: undefined, x: undefined, s: undefined })
})
