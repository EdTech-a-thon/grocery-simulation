import { test, expect } from '@playwright/test'

// A fresh teacher and identifier per run, so repeated runs never collide.
const run = `S${Date.now().toString(36).toUpperCase().slice(-6)}`

test('coupons print in sheets, and printing never loses the page underneath', async ({ page }) => {
  const problems: string[] = []
  page.on('console', (m) => { if (m.type() === 'error') problems.push(m.text()) })
  page.on('pageerror', (e) => problems.push(String(e)))

  await page.goto('/')
  await expect(page.locator('.landing-hero')).toBeVisible()
  await expect(page.locator('.student-store-scene')).toBeVisible()

  await page.getByRole('button', { name: 'Teacher sign in' }).click()
  await expect(page).toHaveURL(/\/teacher$/)

  await page.getByRole('button', { name: 'Create a teacher account' }).click()
  await page.getByLabel('Your name').fill('Ms. Smoke')
  await page.getByLabel('School email').fill(`smoke-${run}@school.test`)
  await page.getByLabel('Password').fill('classgrocery1234')
  await page.getByRole('button', { name: 'Create account' }).click()

  await page.getByLabel('Your identifier').fill(run)
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await page.getByRole('button', { name: 'Create New Store' }).click()
  await page.getByLabel('Store name').fill(`Smoke ${run}`)
  await page.getByLabel('Store code').fill('P1')
  await page.getByRole('button', { name: 'Create store' }).click()
  await expect(page.getByRole('heading', { name: 'Prices and stock' })).toBeVisible()

  // Random coupons, then the print-all sheet.
  await page.getByRole('button', { name: 'Coupons' }).click()
  await page.getByLabel('Different coupon designs').fill('2')
  await page.getByRole('button', { name: 'Generate random coupons' }).click()
  await expect(page.getByText('2 ready to use')).toBeVisible()
  await page.getByRole('button', { name: 'Print all coupons to PDF' }).click()
  await expect(page.getByLabel('Copies to print')).toHaveCount(2)
  await page.getByLabel('Copies to print').nth(0).fill('6')
  await page.getByLabel('Copies to print').nth(1).fill('6')
  await page.getByRole('button', { name: 'Open print preview' }).click()
  await expect(page.locator('.print-sheet')).toContainText('12 coupons, 10 per page')
  await expect(page.locator('.coupon-sheet')).toHaveCount(2)
  await expect(page.locator('.print-coupon')).toHaveCount(12)
  await expect(page.locator('.coupon-barcode').first()).toBeVisible()
  await page.getByRole('button', { name: 'Back' }).click()
  await expect(page.getByText('2 ready to use')).toBeVisible()

  // Student view: shop, then come back to the same aisle after printing.
  await page.getByRole('button', { name: 'View as Student' }).click()
  await page.getByRole('button', { name: 'Next aisle' }).click()
  const aisle = (await page.locator('.shelf-topline h2').innerText()).trim()
  await page.locator('.shelf-product').first().click()
  await expect(page.locator('.cart-line')).toHaveCount(1)
  await page.getByRole('button', { name: 'Check out' }).click()
  await page.getByRole('button', { name: 'Print', exact: true }).click()
  await expect(page.locator('.print-receipt')).toBeVisible()
  await page.getByRole('button', { name: 'Back' }).click()
  await expect(page.locator('.shelf-topline h2')).toHaveText(aisle)
  await page.getByRole('button', { name: 'Close' }).click()

  // A dollar-off coupon changes the label and the field suffix.
  await page.getByRole('button', { name: 'Exit student view' }).click()
  await page.getByRole('button', { name: 'Coupons' }).click()
  await page.getByLabel('Discount type').selectOption('dollars')
  await expect(page.locator('[data-discount-amount]')).toHaveValue('1.00')
  await expect(page.locator('.field-suffix')).toHaveText('$')

  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.locator('.landing-hero')).toBeVisible()

  // A reload lands back on the welcome screen, signed out.
  await page.reload()
  await expect(page.locator('.landing-hero')).toBeVisible()

  expect(problems).toEqual([])
})
