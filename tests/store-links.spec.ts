import { test, expect, type Page } from '@playwright/test'

// A teacher who only has the student link — say, one a colleague shared — can
// open it for editing and hand out a new link. The old link keeps its store.

/** Opens a student link and returns the shelf button for milk at the given price. */
async function milkOnTheShelf(page: Page, link: string, price: string) {
  await page.goto(link)
  await page.getByRole('button', { name: 'Enter the store' }).click()
  for (let attempt = 0; attempt < 14; attempt++) {
    if ((await page.locator('.shelf-topline h2').innerText()).includes('Dairy and Eggs')) break
    await page.getByRole('button', { name: 'Next aisle' }).click()
  }
  return page.getByRole('button', { name: new RegExp(`^Add Milk for \\$${price.replace('.', '\\.')}`) })
}

test('a teacher opens a student link, edits the store and gets a new link', async ({ page, browser }) => {
  // Someone builds a store and hands out its student link.
  await page.goto('/teacher')
  await page.locator('.store-list-heading').getByRole('button', { name: 'Create' }).click()
  await page.getByLabel('Store name').fill('Shared Market')
  await page.getByRole('button', { name: 'Inventory' }).click()
  await expect.poll(() => page.url()).toContain('#')
  const before = page.url()
  await page.getByRole('button', { name: 'Dairy and Eggs' }).click()
  await page.getByLabel('Price for Milk').fill('9.99')
  await page.getByLabel('Price for Milk').blur()
  await expect.poll(() => page.url()).not.toBe(before)
  const oldLink = page.url().replace('/teacher#', '/shop#')

  // Another teacher, on another computer, has nothing but that link.
  const other = await (await browser.newContext({ baseURL: test.info().project.use.baseURL })).newPage()
  await other.goto('/teacher')
  await other.locator('.store-list-heading').getByRole('button', { name: 'Import' }).click()
  await other.getByLabel('Store link').fill(`  ${oldLink}  `)
  await other.locator('.import-modal').getByRole('button', { name: 'Import' }).click()
  await expect(other.getByRole('heading', { name: 'Inventory' })).toBeVisible()
  await expect(other.locator('.sidebar-storefront-sign')).toHaveText('Shared Market')
  await expect(other.locator('.status-message')).toContainText('Opened Shared Market from its link.')
  await other.getByRole('button', { name: 'Dairy and Eggs' }).click()
  await expect(other.getByLabel('Price for Milk')).toHaveValue('9.99')

  // Nothing has changed yet, so the class's link is still right.
  const copy = other.locator('.store-sidebar-actions .primary-button')
  await expect(copy).toHaveText('Copy student link')

  await other.getByLabel('Price for Milk').fill('2.00')
  await other.getByLabel('Price for Milk').blur()
  await expect(copy).toHaveText('Copy new student link')
  await copy.click()
  await expect(copy).toHaveText('Copy student link')
  const newLink = other.url().replace('/teacher#', '/shop#')
  expect(newLink).not.toBe(oldLink)

  // The new link has the change; the old one still opens the old store.
  const student = await (await browser.newContext({ baseURL: test.info().project.use.baseURL })).newPage()
  await expect(await milkOnTheShelf(student, newLink, '2.00')).toBeVisible()
  await expect(await milkOnTheShelf(student, oldLink, '9.99')).toBeVisible()
})

test('pasting something that is not a store link says so', async ({ page }) => {
  await page.goto('/teacher')
  await page.locator('.store-list-heading').getByRole('button', { name: 'Import' }).click()
  await page.getByLabel('Store link').fill('https://example.com/not-a-store')
  await page.locator('.import-modal').getByRole('button', { name: 'Import' }).click()
  await expect(page.locator('.import-problem')).toHaveText('That store link did not work. It may have been cut short when it was copied.')
})

test('a store downloaded as a file imports again, on any computer', async ({ page, browser }) => {
  await page.goto('/teacher')
  await page.locator('.store-list-heading').getByRole('button', { name: 'Create' }).click()
  await page.getByLabel('Store name').fill('File Market')
  await page.getByRole('button', { name: 'Inventory' }).click()
  await page.getByRole('button', { name: 'Dairy and Eggs' }).click()
  await page.getByLabel('Price for Milk').fill('7.77')
  await page.getByLabel('Price for Milk').blur()
  await page.getByRole('button', { name: 'My stores' }).click()

  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download file' }).click()
  const download = await downloading
  expect(download.suggestedFilename()).toBe('File Market.json')
  const file = await download.path()

  const other = await (await browser.newContext({ baseURL: test.info().project.use.baseURL })).newPage()
  await other.goto('/teacher')
  await other.locator('.store-list-heading').getByRole('button', { name: 'Import' }).click()
  await other.locator('.import-file-button input').setInputFiles(file)
  await expect(other.locator('.sidebar-storefront-sign')).toHaveText('File Market')
  await other.getByRole('button', { name: 'Dairy and Eggs' }).click()
  await expect(other.getByLabel('Price for Milk')).toHaveValue('7.77')

  // An imported store is on the list straight away.
  await other.getByRole('button', { name: 'My stores' }).click()
  await expect(other.locator('.store-summary')).toHaveCount(1)

  // Anything else is turned away.
  await other.locator('.store-list-heading').getByRole('button', { name: 'Import' }).click()
  await other.locator('.import-file-button input').setInputFiles({ name: 'notes.json', mimeType: 'application/json', buffer: Buffer.from('{"hello": 1}') })
  await expect(other.locator('.import-problem')).toContainText('That file is not a Class Grocery store.')
})
