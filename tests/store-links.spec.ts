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
  await page.locator('.store-list-heading').getByRole('button', { name: 'Create store' }).click()
  await page.getByLabel('Store name').fill('Shared Market')
  await page.locator('.store-modal').getByRole('button', { name: 'Create store' }).click()
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
  await other.getByRole('button', { name: 'Import store' }).click()
  await other.getByLabel('Store link').fill(`  ${oldLink}  `)
  await other.getByRole('button', { name: 'Import', exact: true }).click()
  await expect(other.getByRole('heading', { name: 'Prices and stock' })).toBeVisible()
  await expect(other.locator('.teacher-hero h2')).toHaveText('Shared Market')
  await expect(other.locator('.status-message')).toContainText('Opened Shared Market from its link.')
  await other.getByRole('button', { name: 'Dairy and Eggs' }).click()
  await expect(other.getByLabel('Price for Milk')).toHaveValue('9.99')

  // Nothing has changed yet, so the class's link is still right.
  await expect(other.locator('.link-outdated-warning')).toHaveCount(0)

  await other.getByLabel('Price for Milk').fill('2.00')
  await other.getByLabel('Price for Milk').blur()
  const warning = other.locator('.link-outdated-warning')
  await expect(warning).toContainText('Students will not see these changes until you share a new link.')
  await warning.getByRole('button', { name: 'Copy new student link' }).click()
  await expect(warning).toHaveCount(0)
  const newLink = other.url().replace('/teacher#', '/shop#')
  expect(newLink).not.toBe(oldLink)

  // The new link has the change; the old one still opens the old store.
  const student = await (await browser.newContext({ baseURL: test.info().project.use.baseURL })).newPage()
  await expect(await milkOnTheShelf(student, newLink, '2.00')).toBeVisible()
  await expect(await milkOnTheShelf(student, oldLink, '9.99')).toBeVisible()
})

test('pasting something that is not a store link says so', async ({ page }) => {
  await page.goto('/teacher')
  await page.getByRole('button', { name: 'Import store' }).click()
  await page.getByLabel('Store link').fill('https://example.com/not-a-store')
  await page.getByRole('button', { name: 'Import', exact: true }).click()
  await expect(page.locator('.import-problem')).toHaveText('That store link did not work. It may have been cut short when it was copied.')
})

test('a store downloaded as a file imports again, on any computer', async ({ page, browser }) => {
  await page.goto('/teacher')
  await page.locator('.store-list-heading').getByRole('button', { name: 'Create store' }).click()
  await page.getByLabel('Store name').fill('File Market')
  await page.locator('.store-modal').getByRole('button', { name: 'Create store' }).click()
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
  await other.getByRole('button', { name: 'Import store' }).click()
  await other.locator('.import-file-button input').setInputFiles(file)
  await expect(other.locator('.teacher-hero h2')).toHaveText('File Market')
  await other.getByRole('button', { name: 'Dairy and Eggs' }).click()
  await expect(other.getByLabel('Price for Milk')).toHaveValue('7.77')

  // An imported store is on the list straight away.
  await other.getByRole('button', { name: 'My stores' }).click()
  await expect(other.locator('.store-summary')).toHaveCount(1)

  // Anything else is turned away.
  await other.getByRole('button', { name: 'Import store' }).click()
  await other.locator('.import-file-button input').setInputFiles({ name: 'notes.json', mimeType: 'application/json', buffer: Buffer.from('{"hello": 1}') })
  await expect(other.locator('.import-problem')).toContainText('That file is not a Class Grocery store.')
})
