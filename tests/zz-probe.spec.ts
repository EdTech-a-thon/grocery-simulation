import { test, expect } from '@playwright/test'

test('probe identifier step', async ({ page }) => {
  const run = Date.now().toString(36).toUpperCase().slice(-6)
  page.on('console', (m) => console.log('CONSOLE', m.type(), m.text()))
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message))
  page.on('response', async (r) => {
    if (r.url().includes('/api/') && r.status() >= 400) {
      console.log('HTTP', r.status(), r.request().method(), r.url(), await r.text().catch(() => ''))
    }
  })

  await page.goto('/teacher')
  await page.getByRole('button', { name: 'Create a teacher account' }).click()
  await page.getByLabel('Your name').fill('Probe')
  await page.getByLabel('School email').fill(`probe-${run}@school.test`)
  await page.getByLabel('Password').fill('classgrocery1234')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByRole('heading', { name: 'Choose your class identifier' })).toBeVisible()
  await page.getByLabel('Your identifier').fill(`Z${run}`)
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.waitForTimeout(4000)
  console.log('BODY:', (await page.locator('main, .identity-card').first().innerText()).slice(0, 400))
})
