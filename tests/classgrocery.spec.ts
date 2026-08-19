import { test, expect, type Page, type APIRequestContext } from '@playwright/test'

// A fresh identifier per run, so repeated runs never collide on the site-wide
// unique class identifier.
const run = Date.now().toString(36).toUpperCase().slice(-6)
const prefix = `T${run}`
const otherPrefix = `O${run}`
const teacher = { email: `teacher-${run}@school.test`, password: 'classgrocery1234', name: 'Ms. Rivera', prefix }
const other = { email: `other-${run}@school.test`, password: 'classgrocery1234', name: 'Mr. Chen', prefix: otherPrefix }
const store = { name: `Room ${run}`, label: 'P3', joinCode: `${prefix}-P3` }
const copy = { name: `Room ${run} Copy`, label: 'P4', joinCode: `${prefix}-P4` }

const pocketbaseUrl = process.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090'

type PublicStore = {
  store: { name: string; color: string; joinLabel: string; joinCode: string }
  items: Record<string, { price?: number; hidden?: boolean }>
  coupons: Array<{ code: string; discountType: string; discountAmount: number; productId: string }>
}

/** Reads a store the way an anonymous student's browser does. */
async function readStore(request: APIRequestContext, joinCode: string) {
  const response = await request.get(`${pocketbaseUrl}/api/classgrocery/store/${joinCode}`)
  expect(response.ok()).toBeTruthy()
  return (await response.json()) as PublicStore
}

async function signUp(page: Page, who: typeof teacher) {
  await page.goto('/teacher')
  await page.getByRole('button', { name: 'Create a teacher account' }).click()
  await page.getByLabel('Your name').fill(who.name)
  await page.getByLabel('School email').fill(who.email)
  await page.getByLabel('Password').fill(who.password)
  await page.getByRole('button', { name: 'Create account' }).click()

  // Signing up lands on the class identifier question, which has to be answered
  // before any store can exist.
  await expect(page.getByRole('heading', { name: 'Choose your class identifier' })).toBeVisible()
  await page.getByLabel('Your identifier').fill(who.prefix)
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await expect(page.getByRole('heading', { name: 'My stores' })).toBeVisible()
}

async function signIn(page: Page, who: typeof teacher) {
  await page.goto('/teacher')
  await page.getByLabel('School email').fill(who.email)
  await page.getByLabel('Password').fill(who.password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'My stores' })).toBeVisible()
}

/** Signs in and opens the named store's price studio. */
async function openStore(page: Page, name = store.name) {
  await signIn(page, teacher)
  await page.locator('.store-summary', { hasText: name }).getByRole('button', { name: 'Open' }).click()
  await expect(page.getByRole('heading', { name: 'Prices and stock' })).toBeVisible()
}

/**
 * Joins the way a student does. However the code was typed, the badge shows the
 * tidy form of it, so `shown` is what the screen is expected to say.
 */
async function joinAsStudent(page: Page, typed: string, shown = typed) {
  await page.goto('/')
  await page.getByLabel('Store code').fill(typed)
  await page.getByRole('button', { name: 'Student join store' }).click()
  await expect(page.getByText(`Store code: ${shown}`)).toBeVisible()
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

test.describe.configure({ mode: 'serial' })

test('a teacher signs up and creates a store', async ({ page }) => {
  await signUp(page, teacher)

  await page.getByLabel('Store name').fill(store.name)
  await page.getByLabel('Store color').selectOption('green')
  await page.getByLabel('Class code').fill(store.label)
  await expect(page.locator('.join-code-preview')).toContainText(`Students will join with ${store.joinCode}`)
  await page.getByRole('button', { name: 'Create store' }).click()

  await expect(page.getByRole('heading', { name: 'Prices and stock' })).toBeVisible()
  await expect(page.locator('.teacher-access-panel')).toContainText(`Students join with ${store.joinCode}`)
})

test('the teacher sets prices and chooses what the store stocks', async ({ page, request }) => {
  await openStore(page)

  await page.getByRole('button', { name: 'Dairy and Eggs' }).click()
  await page.getByLabel('Price for Milk').fill('9.99')
  await page.getByLabel('Price for Milk').blur()
  await expect(page.locator('.status-message')).toHaveText('Saved.')

  await page.getByLabel('Stock Cottage Cheese in this store').uncheck()
  await expect(page.locator('.price-edit-card', { has: page.getByLabel('Stock Cottage Cheese in this store') })).toHaveClass(/price-edit-card-hidden/)

  // Empty one whole aisle, which should drop out of the shopper's view entirely.
  await page.getByRole('button', { name: 'Seafood' }).click()
  await page.getByRole('button', { name: 'Stock none' }).click()
  await expect(page.locator('.status-message')).toHaveText('Seafood taken off the shelves.')

  const published = await readStore(request, store.joinCode)
  expect(published.items.milk.price).toBe(9.99)
  expect(published.items['cottage-cheese'].hidden).toBe(true)
  expect(published.items.salmon.hidden).toBe(true)
})

test('the teacher creates coupons', async ({ page, request }) => {
  await openStore(page)
  await page.getByRole('button', { name: 'Coupons' }).click()

  await page.getByLabel('Applies to').selectOption('milk')
  await page.locator('[data-discount-amount]').fill('10')
  await page.getByLabel('Number of this coupon').fill('4')
  await page.getByRole('button', { name: 'Create coupon' }).click()
  await expect(page.locator('.print-sheet')).toContainText('4 coupons, 10 per page')
  await page.getByRole('button', { name: 'Back' }).click()

  // A dollars coupon worth far more than the item it applies to.
  await page.getByLabel('Discount type').selectOption('dollars')
  await page.locator('[data-discount-amount]').fill('50')
  await page.getByLabel('Applies to').selectOption('apple')
  await page.getByLabel('Number of this coupon').fill('1')
  await page.getByRole('button', { name: 'Create coupon' }).click()
  await page.getByRole('button', { name: 'Back' }).click()

  await expect(page.getByText('2 ready to use')).toBeVisible()

  const published = await readStore(request, store.joinCode)
  expect(published.coupons).toHaveLength(2)
  expect(published.coupons.some((coupon) => coupon.discountType === 'dollars' && coupon.productId === 'apple')).toBe(true)
  // Print counts are a teacher-only detail and must not reach students.
  expect(published.coupons.every((coupon) => !('copies' in coupon))).toBe(true)
})

test('an emptied aisle disappears from the student view', async ({ page }) => {
  await openStore(page)
  await page.getByRole('button', { name: 'View as Student' }).click()

  const titles = await visibleAisleTitles(page)
  expect(titles.some((title) => title.includes('Seafood'))).toBe(false)
  expect(titles.some((title) => title.includes('Dairy and Eggs'))).toBe(true)
})

test('viewing as a student swaps the header for the Student View banner', async ({ page }) => {
  await openStore(page)
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

test('a real student keeps the normal header, with no exit button', async ({ page }) => {
  await joinAsStudent(page, store.joinCode)
  await expect(page.locator('.app-header')).toBeVisible()
  await expect(page.locator('.student-view-header')).toHaveCount(0)
})

test('a student joins the store and sees only what it stocks', async ({ page }) => {
  await joinAsStudent(page, store.joinCode)
  await goToAisle(page, 'Dairy and Eggs')

  await expect(page.getByRole('button', { name: /Add Milk for \$9\.99/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Add Cottage Cheese/ })).toHaveCount(0)
})

test('duplicating a store copies its stock and coupons but reissues the codes', async ({ page, request }) => {
  const original = await readStore(request, store.joinCode)

  await signIn(page, teacher)
  const answers = [copy.name, 'blue', copy.label]
  page.on('dialog', (dialog) => dialog.accept(answers.shift() ?? ''))
  await page.locator('.store-summary', { hasText: store.name }).getByRole('button', { name: 'Duplicate' }).first().click()
  await expect(page.locator('.status-message')).toContainText(`Students join with ${copy.joinCode}`)

  const duplicated = await readStore(request, copy.joinCode)
  expect(duplicated.store.color).toBe('blue')
  expect(duplicated.items).toEqual(original.items)
  expect(duplicated.coupons).toHaveLength(original.coupons.length)

  // Same discounts, but codes printed for the old class must not work here.
  const originalCodes = original.coupons.map((coupon) => coupon.code)
  expect(duplicated.coupons.every((coupon) => !originalCodes.includes(coupon.code))).toBe(true)
  expect(duplicated.coupons.map((coupon) => `${coupon.discountType}:${coupon.discountAmount}:${coupon.productId}`).sort())
    .toEqual(original.coupons.map((coupon) => `${coupon.discountType}:${coupon.discountAmount}:${coupon.productId}`).sort())

  // The original is untouched.
  expect((await readStore(request, store.joinCode)).coupons.map((c) => c.code).sort()).toEqual(originalCodes.sort())
})

test('the receipt itemizes the cart and caps a dollar coupon at the item price', async ({ page, request }) => {
  const published = await readStore(request, store.joinCode)
  const dollarsCoupon = published.coupons.find((coupon) => coupon.discountType === 'dollars')!
  page.on('dialog', (dialog) => dialog.accept())

  await joinAsStudent(page, store.joinCode)
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
  await page.getByLabel('Coupon code').fill(dollarsCoupon.code)
  await page.getByRole('button', { name: 'Apply', exact: true }).click()

  await page.getByRole('button', { name: 'Close' }).click()
  await page.getByRole('button', { name: 'Check out' }).click()

  // $1.78 of apples, so a $50 coupon is capped at $1.78 and nothing goes negative.
  await expect(receipt.locator('.receipt-item-coupon')).toContainText(`-$1.78`)
  await expect(receipt.locator('.receipt-item-coupon')).toContainText(dollarsCoupon.code)
  await expect(receipt.locator('.receipt-final strong')).toHaveText('$0.00')
  await expect(receipt.locator('.coupon-total strong')).toHaveText('$1.78')
})

test('the receipt prints with its items, coupons and total saved', async ({ page, request }) => {
  const published = await readStore(request, store.joinCode)
  const dollarsCoupon = published.coupons.find((coupon) => coupon.discountType === 'dollars')!
  page.on('dialog', (dialog) => dialog.accept())

  await joinAsStudent(page, store.joinCode)
  await goToAisle(page, 'Produce')
  await page.locator('.shelf-product-card', { hasText: 'Apple' }).first().getByRole('button', { name: /^Add Apple for/ }).click()
  await page.getByRole('button', { name: 'Apply Coupon' }).click()
  await page.getByLabel('Coupon code').fill(dollarsCoupon.code)
  await page.getByRole('button', { name: 'Apply', exact: true }).click()

  await page.getByRole('button', { name: 'Close' }).click()
  await page.getByRole('button', { name: 'Check out' }).click()
  await page.getByRole('button', { name: 'Print' }).click()

  const printed = page.locator('.print-receipt')
  await expect(printed.getByText('CLASSGROCERY', { exact: true })).toBeVisible()
  await expect(printed.locator('.receipt-item-name', { hasText: 'Apple' })).toBeVisible()
  await expect(printed.locator('.receipt-item-coupon')).toContainText(dollarsCoupon.code)
  await expect(printed.getByText('Total Amount Saved Today')).toBeVisible()

  await page.getByRole('button', { name: 'Back' }).click()
  await expect(page.locator('.receipt')).toBeVisible()
})

test('a student who leaves out the dash still lands in the right store', async ({ page, request }) => {
  // The dash is decoration. Typing round it, or in lower case, must still work.
  const plain = await readStore(request, store.joinCode.replace('-', ''))
  expect(plain.store.name).toBe(store.name)
  expect(plain.store.joinCode).toBe(store.joinCode)

  await joinAsStudent(page, store.joinCode.replace('-', '').toLowerCase(), store.joinCode)
})

test('a join link opens the store without the student typing anything', async ({ page }) => {
  await page.goto(`/j/${store.joinCode.replace('-', '')}`)

  // The link lands on the normal student dashboard, already in the store.
  await expect(page.getByText(`Store code: ${store.joinCode}`)).toBeVisible()
  await page.getByRole('button', { name: 'Enter the store' }).click()
  await expect(page.locator('.shelf-stage')).toBeVisible()
})

test('a link to a store that is not there explains itself', async ({ page }) => {
  await page.goto('/j/NOSUCHSTORE')
  await expect(page.getByRole('heading', { name: 'That store link did not work' })).toBeVisible()
})

test('a teacher cannot use one of their own class codes twice', async ({ page }) => {
  await signIn(page, teacher)

  await page.getByLabel('Store name').fill('Another Room')
  await page.getByLabel('Class code').fill(store.label)
  await page.getByRole('button', { name: 'Create store' }).click()

  // The clash is with the teacher's own class, so it is named as one.
  await expect(page.locator('.status-message'))
    .toContainText(`You already have a class called ${store.label}`)
})

test("another teacher sees none of the first teacher's stores, and may reuse the same class code", async ({ page, request }) => {
  await signUp(page, other)
  await expect(page.locator('.store-list')).toContainText('0 stores')
  await expect(page.locator('.store-list')).toContainText('Create your first store to get started.')
  await expect(page.getByText(store.name)).toHaveCount(0)

  // P3 is taken by the first teacher. Under the old site-wide rule that was a
  // clash; now the identifier keeps the two apart.
  await page.getByLabel('Store name').fill('Mr Chen P3')
  await page.getByLabel('Class code').fill(store.label)
  await page.getByRole('button', { name: 'Create store' }).click()
  await expect(page.getByRole('heading', { name: 'Prices and stock' })).toBeVisible()

  const mine = await readStore(request, `${other.prefix}-${store.label}`)
  expect(mine.store.name).toBe('Mr Chen P3')
  const theirs = await readStore(request, store.joinCode)
  expect(theirs.store.name).toBe(store.name)
})

// ------------------------------------------------------- name brands vs CG
//
// These run last on purpose: they restock the whole store, so anything that
// asserts on an emptied aisle has to have happened already.

test('a teacher stocks both brands, and the CG line reaches the shelves', async ({ page, request }) => {
  await openStore(page)

  // Out of the box a store carries only the name brands.
  const before = await readStore(request, store.joinCode)
  expect(before.items['milk-cg']).toBeUndefined()

  await page.getByRole('button', { name: 'Both brands' }).click()
  await expect(page.locator('.status-message')).toHaveText('Both brands on the shelves, side by side.')

  const after = await readStore(request, store.joinCode)
  expect(after.items['eggs'].hidden).toBeFalsy()
  expect(after.items['eggs-cg'].hidden).toBeFalsy()
  // 15% under the catalog's $1.59.
  expect(after.items['eggs-cg'].price).toBe(1.35)
  // Milk was marked up to $9.99 earlier in this run, and the CG twin is priced
  // off what this store charges rather than off the catalog.
  expect(after.items['milk-cg'].price).toBe(8.49)
})

test('a student can compare a name brand with its CG twin', async ({ page }) => {
  await joinAsStudent(page, store.joinCode)
  await goToAisle(page, 'Dairy and Eggs')

  await expect(page.getByRole('button', { name: /^Add Eggs for \$1\.59/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Add CG Eggs for \$1\.35/ })).toBeVisible()
})

test('stocking the name brands puts the CG line away again', async ({ page, request }) => {
  await openStore(page)

  await page.getByRole('button', { name: 'Name brands' }).click()
  await expect(page.locator('.status-message')).toHaveText('Name brands on the shelves. The CG line is put away.')

  const published = await readStore(request, store.joinCode)
  expect(published.items['eggs'].hidden).toBeFalsy()
  expect(published.items['eggs-cg'].hidden).toBe(true)
  // The price a teacher may have typed survives being put away.
  expect(published.items['eggs-cg'].price).toBe(1.35)
})

test('stocking the CG store brands puts the name brands away', async ({ page, request }) => {
  await openStore(page)

  await page.getByRole('button', { name: 'CG store brands' }).click()
  await expect(page.locator('.status-message'))
    .toHaveText('CG store brands on the shelves. The name brands are put away.')

  const published = await readStore(request, store.joinCode)
  expect(published.items['eggs'].hidden).toBe(true)
  expect(published.items['eggs-cg'].hidden).toBeFalsy()
})
