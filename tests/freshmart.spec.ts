import { test, expect, type Page, type APIRequestContext } from '@playwright/test'

// One teacher, one store and one join code per run, so repeated runs never
// collide on the globally unique join code.
const run = Date.now().toString(36).toUpperCase().slice(-6)
const teacher = { email: `teacher-${run}@school.test`, password: 'freshmart1234', name: 'Ms. Rivera' }
const other = { email: `other-${run}@school.test`, password: 'freshmart1234', name: 'Mr. Chen' }
const store = { name: `Room ${run}`, joinCode: `ROOM-${run}` }
const copy = { name: `Room ${run} Copy`, joinCode: `COPY-${run}` }

const pocketbaseUrl = process.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090'

type PublicStore = {
  store: { name: string; color: string; joinCode: string }
  items: Record<string, { price?: number; hidden?: boolean }>
  coupons: Array<{ code: string; discountType: string; discountAmount: number; productId: string }>
}

/** Reads a store the way an anonymous student's browser does. */
async function readStore(request: APIRequestContext, joinCode: string) {
  const response = await request.get(`${pocketbaseUrl}/api/freshmart/store/${joinCode}`)
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

async function joinAsStudent(page: Page, joinCode: string) {
  await page.goto('/')
  await page.getByLabel('Store code').fill(joinCode)
  await page.getByRole('button', { name: 'Student join store' }).click()
  await expect(page.getByText(`Store code: ${joinCode}`)).toBeVisible()
  await page.getByRole('button', { name: 'Enter the store' }).click()
  await expect(page.locator('.shelf-stage')).toBeVisible()
}

async function goToAisle(page: Page, title: string) {
  for (let attempt = 0; attempt < 14; attempt++) {
    if ((await page.locator('.shelf-topline h2').innerText()).trim() === title) return
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
  await page.getByLabel('Student join code').fill(store.joinCode)
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
  await expect(page.locator('.price-edit-card', { hasText: 'Cottage Cheese' })).toHaveClass(/price-edit-card-hidden/)

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

test('an emptied aisle disappears from the student preview', async ({ page }) => {
  await openStore(page)
  await page.getByRole('button', { name: 'Student preview' }).click()

  const titles = await visibleAisleTitles(page)
  expect(titles).not.toContain('Seafood')
  expect(titles).toContain('Dairy and Eggs')
})

test('presentation mode hides the teacher chrome', async ({ page }) => {
  await openStore(page)
  await page.getByRole('button', { name: 'Present' }).click()

  await expect(page.locator('body')).toHaveClass(/presenting/)
  await expect(page.locator('.app-header')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Exit presentation' })).toBeVisible()
  await expect(page.locator('.shelf-stage')).toBeVisible()

  await page.getByRole('button', { name: 'Exit presentation' }).click()
  await expect(page.locator('body')).not.toHaveClass(/presenting/)
  await expect(page.locator('.app-header')).toBeVisible()
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
  const answers = [copy.name, 'blue', copy.joinCode]
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

test('the receipt itemises the cart and caps a dollar coupon at the item price', async ({ page, request }) => {
  const published = await readStore(request, store.joinCode)
  const dollarsCoupon = published.coupons.find((coupon) => coupon.discountType === 'dollars')!
  page.on('dialog', (dialog) => dialog.accept())

  await joinAsStudent(page, store.joinCode)
  await goToAisle(page, 'Produce')
  await page.locator('.shelf-product-card', { hasText: 'Apple' }).first().getByRole('button', { name: /^Add Apple for/ }).click()
  await page.locator('.shelf-product-card', { hasText: 'Apple' }).first().getByRole('button', { name: 'Add one more Apple' }).click()

  const receipt = page.locator('.receipt')
  await expect(receipt.locator('.receipt-item-name', { hasText: 'Apple' })).toBeVisible()
  await expect(receipt.locator('.receipt-item-count')).toContainText('2 ×')
  await expect(receipt.locator('.receipt-item').filter({ hasText: 'Apple' }).locator('strong').first()).toHaveText('$1.78')

  await page.getByLabel('Coupon code').fill(dollarsCoupon.code)
  await page.getByRole('button', { name: 'Apply', exact: true }).click()

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
  await page.getByLabel('Coupon code').fill(dollarsCoupon.code)
  await page.getByRole('button', { name: 'Apply', exact: true }).click()

  await page.getByRole('button', { name: 'Print' }).click()

  const printed = page.locator('.print-receipt')
  await expect(printed.getByText('FRESH MART', { exact: true })).toBeVisible()
  await expect(printed.locator('.receipt-item-name', { hasText: 'Apple' })).toBeVisible()
  await expect(printed.locator('.receipt-item-coupon')).toContainText(dollarsCoupon.code)
  await expect(printed.getByText('Total Amount Saved Today')).toBeVisible()

  await page.getByRole('button', { name: 'Back' }).click()
  await expect(page.locator('.receipt')).toBeVisible()
})

test("another teacher sees none of the first teacher's stores", async ({ page }) => {
  await signUp(page, other)
  await expect(page.locator('.store-list')).toContainText('0 stores')
  await expect(page.locator('.store-list')).toContainText('Create your first store to get started.')
  await expect(page.getByText(store.name)).toHaveCount(0)
})
