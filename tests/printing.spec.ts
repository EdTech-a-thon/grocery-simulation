import { test, expect } from '@playwright/test'

test('coupons print in sheets, and printing never loses the page underneath', async ({ page }) => {
  const problems: string[] = []
  page.on('console', (m) => { if (m.type() === 'error') problems.push(m.text()) })
  page.on('pageerror', (e) => problems.push(String(e)))

  // The analytics beacon only talks to Cloudflare from the real domain, so from
  // a test it fails and fills the console with its own noise. An empty script
  // stands in for it: this test is watching the app's console, not a third
  // party's.
  await page.route('https://static.cloudflareinsights.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }),
  )

  await page.goto('/')
  await expect(page.locator('.landing-hero')).toBeVisible()
  await expect(page.locator('.student-store-scene')).toBeVisible()

  await page.getByRole('link', { name: 'Get started' }).click()
  await expect(page).toHaveURL(/\/teacher$/)

  await page.getByRole('button', { name: 'Create New Store' }).click()
  await page.getByLabel('Store name').fill('Smoke Test Market')
  await page.getByRole('button', { name: 'Create store' }).click()
  await expect(page.getByRole('heading', { name: 'Prices and stock' })).toBeVisible()

  // Random coupons, then the print-all sheet.
  await page.getByRole('button', { name: 'Coupons' }).click()
  await page.getByLabel('Different coupon designs').fill('2')
  await page.getByRole('button', { name: 'Generate random coupons' }).click()
  await expect(page.getByText('2 ready to use')).toBeVisible()
  await page.getByRole('button', { name: 'Print all coupons to PDF' }).click()
  await expect(page.getByRole('dialog', { name: 'Print all coupons' })).toBeVisible()
  await expect(page.getByLabel('Copies to print')).toHaveCount(2)
  // One number sets every coupon's copies at once; each can still be changed after.
  await page.getByLabel('Copies of every coupon').fill('6')
  await expect(page.getByLabel('Copies to print').nth(0)).toHaveValue('6')
  await expect(page.getByLabel('Copies to print').nth(1)).toHaveValue('6')
  await page.getByRole('button', { name: 'Open print preview' }).click()
  await expect(page.locator('.print-sheet')).toContainText('12 coupons, 10 per page')
  await expect(page.locator('.coupon-sheet')).toHaveCount(2)
  await expect(page.locator('.coupon-sheet').last()).toHaveCSS('break-after', 'auto')
  await expect(page.locator('.print-coupon')).toHaveCount(12)
  await expect(page.locator('.coupon-code strong').first()).toBeVisible()
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

  // The store was never saved, so leaving it asks first.
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'My stores' }).click()
  await expect(page.locator('.store-list')).toContainText('0 stores')

  expect(problems).toEqual([])
})
