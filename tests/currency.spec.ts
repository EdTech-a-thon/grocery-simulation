import { test, expect, type Page } from '@playwright/test'

// A store can price in another currency. The catalog's US dollar prices are
// converted at fixed rates, and so are the prices a teacher typed in.

/** The store as it stands in the page's address, in its packed form (see packStore). */
async function readStore(page: Page): Promise<{ e?: string; l?: string; r?: 1; p?: Record<string, number> }> {
  return page.evaluate(async () => {
    const text = location.hash.slice(1)
    const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'))
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
    return JSON.parse(await new Response(stream).text())
  })
}

test('switching to yen converts the shelves and the teacher’s own prices', async ({ page }) => {
  await page.goto('/teacher')
  await page.locator('.store-list-heading').getByRole('button', { name: 'Create' }).click()
  await page.getByLabel('Store name').fill('Yen Market')
  const pages = page.locator('.store-sidebar-pages')

  await pages.getByRole('button', { name: 'Inventory' }).click()
  await page.getByRole('button', { name: 'Dairy and Eggs' }).click()
  await page.getByLabel('Price for Milk').fill('2.00')
  await page.getByLabel('Price for Milk').blur()
  await expect.poll(async () => (await readStore(page)).p?.milk).toBe(2)

  await pages.getByRole('button', { name: 'Settings' }).click()
  await page.getByLabel('Currency').selectOption('JPY')
  // $2.00 at 157.73 yen to the dollar, to the whole yen.
  await expect.poll(() => readStore(page)).toMatchObject({ e: 'JPY', p: { milk: 315 } })
  await expect(page.locator('.store-preview')).toContainText('¥315')

  await pages.getByRole('button', { name: 'Inventory' }).click()
  await expect(page.getByLabel('Price for Milk')).toHaveValue('315')
  await expect(page.locator('.teacher-money-input').first()).toContainText('¥')

  // Back to dollars, the teacher's price comes back as it was, and dollars
  // offer no rounding button.
  await pages.getByRole('button', { name: 'Settings' }).click()
  await page.getByLabel('Currency').selectOption('USD')
  await expect.poll(async () => (await readStore(page)).e).toBeUndefined()
  await expect.poll(async () => (await readStore(page)).p?.milk).toBe(2)
  await expect(page.getByRole('button', { name: /^Round to/ })).toHaveCount(0)
})

test('a store in another currency can round every price to its round number', async ({ page }) => {
  await page.goto('/teacher')
  await page.locator('.store-list-heading').getByRole('button', { name: 'Create' }).click()
  await page.getByLabel('Store name').fill('Round Market')
  const pages = page.locator('.store-sidebar-pages')

  await pages.getByRole('button', { name: 'Inventory' }).click()
  await page.getByRole('button', { name: 'Dairy and Eggs' }).click()
  await page.getByLabel('Price for Milk').fill('2.00')
  await page.getByLabel('Price for Milk').blur()
  await expect.poll(async () => (await readStore(page)).p?.milk).toBe(2)

  await pages.getByRole('button', { name: 'Settings' }).click()
  await page.getByLabel('Currency').selectOption('JPY')
  await page.getByRole('button', { name: 'Round to ¥10' }).click()
  // The teacher's ¥315 becomes ¥320, and the store remembers it is rounded.
  await expect.poll(() => readStore(page)).toMatchObject({ e: 'JPY', r: 1, p: { milk: 320 } })
  await expect(page.getByText('Every price is rounded to ¥10.')).toBeVisible()

  // Catalog prices are rounded too: every shelf price on the preview ends in 0.
  // (Unit prices are worked out from them, so they are not.)
  const tags = page.locator('.store-preview .price-tag')
  await expect(tags).toHaveCount(3)
  for (const tag of await tags.all()) {
    const price = await tag.evaluate((element) => element.firstChild?.textContent?.trim() ?? '')
    expect(price).toMatch(/^¥[\d,]*0$/)
  }

  // A different currency has a different round number, so it asks again.
  await page.getByLabel('Currency').selectOption('EUR')
  await expect.poll(async () => (await readStore(page)).r).toBeUndefined()
  // Euros are written the European way, with a decimal comma and the sign after.
  const roundToTenCents = page.getByRole('button', { name: /^Round to 0,10\s€$/ })
  await expect(roundToTenCents).toBeVisible()
  // ¥320 is €1.80 at the fixed rates.
  await expect(page.locator('.store-preview')).toContainText(/1,80\s€/)

  await roundToTenCents.click()
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect.poll(async () => (await readStore(page)).r).toBeUndefined()
})

test('a teacher can write the store’s money the way the class does', async ({ page }) => {
  await page.goto('/teacher')
  await page.locator('.store-list-heading').getByRole('button', { name: 'Create' }).click()
  await page.getByLabel('Store name').fill('Épicerie')
  const pages = page.locator('.store-sidebar-pages')

  await pages.getByRole('button', { name: 'Settings' }).click()
  await page.getByLabel('Currency').selectOption('CAD')
  const style = page.getByLabel('Price format')
  await expect(style.locator('option:checked')).toHaveText('$1,234.50')

  // A class in Quebec writes Canadian dollars with a decimal comma and the sign after.
  await style.selectOption({ label: '1 234,50 $' })
  await expect.poll(() => readStore(page)).toMatchObject({ e: 'CAD', l: 'fr-FR' })
  await expect(page.locator('.store-preview .price-tag').first()).toContainText(/^\d+,\d\d\s\$/)

  await pages.getByRole('button', { name: 'Inventory' }).click()
  await page.getByRole('button', { name: 'Dairy and Eggs' }).click()
  await expect(page.locator('.teacher-money-input').first()).toContainText('$')

  // The style is the class's habit, so it stays with a new currency.
  await pages.getByRole('button', { name: 'Settings' }).click()
  await page.getByLabel('Currency').selectOption('USD')
  await expect(page.locator('.store-preview .price-tag').first()).toContainText(/^\d+,\d\d\s\$/)

  // Going back to the usual way leaves nothing in the link.
  await style.selectOption({ index: 0 })
  await expect.poll(async () => (await readStore(page)).l).toBeUndefined()
  await expect(page.locator('.store-preview .price-tag').first()).toContainText(/^\$\d+\.\d\d/)
})
