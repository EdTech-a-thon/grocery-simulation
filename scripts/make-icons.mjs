// Renders the PNG icons from static/favicon.svg (the bare tomato, for browser
// tabs) and static/app-icon.svg (the tomato on a green tile, for home screens,
// which would otherwise fill the see-through corners with black).
//
// The SVGs are the masters, and every browser that can use one gets it directly.
// The PNGs exist for the places that cannot take an SVG at all — an iOS home
// screen, an Android install prompt, and older tab bars — so they are rendered
// rather than drawn, and re-rendered whenever the mark changes:
//
//   node scripts/make-icons.mjs
//
// Rendering is done by the Chromium that Playwright already installs for the
// tests, which saves the repo a second image toolchain.

import { chromium } from '@playwright/test'
import { readFileSync, writeFileSync } from 'node:fs'

/** What each size is for, where it goes, and which drawing it comes from. */
const icons = [
  { size: 32, file: 'static/favicon-32.png', source: 'static/favicon.svg' },
  { size: 180, file: 'static/apple-touch-icon.png', source: 'static/app-icon.svg' },
  { size: 192, file: 'static/icon-192.png', source: 'static/app-icon.svg' },
  { size: 512, file: 'static/icon-512.png', source: 'static/app-icon.svg' },
]

const browser = await chromium.launch()

for (const { size, file, source } of icons) {
  const svg = readFileSync(source, 'utf8')
  // A page exactly the size of the icon, with the artwork filling it and
  // nothing else on it, so the screenshot *is* the icon.
  const page = await browser.newPage({ viewport: { width: size, height: size } })
  await page.setContent(
    `<body style="margin:0">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body>`,
  )
  writeFileSync(file, await page.screenshot({ omitBackground: true }))
  await page.close()
  console.log(`${file}  ${size}×${size}`)
}

await browser.close()
