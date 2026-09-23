// Turning a drawing into something that can actually be looked at.
//
// Two jobs, both done by the Chromium that Playwright already installs for the
// tests, so the repo does not grow a second image toolchain:
//
//   measure()  asks the browser whether the file is well-formed XML at all, and
//              where the ink actually landed inside the frame. A drawing that
//              parses but sits in one corner is the failure a text check cannot
//              see, and it is common.
//   shoot()    renders the PNG the judge looks at.

import { chromium } from '@playwright/test'

/** The shelf behind the tile: neutral, so a white CG panel is still visible. */
const shelf = '#e8e4dc'

const frame = { width: 160, height: 220 }

export async function openRenderer() {
  const browser = await chromium.launch()

  // A page per call, because products are drawn several at a time and two
  // measurements sharing one document would overwrite each other's body.
  async function measure(svg) {
    const page = await browser.newPage({ viewport: { width: 480, height: 660 } })
    try {
      return await measureOn(page, svg)
    } finally {
      await page.close()
    }
  }

  async function measureOn(page, svg) {
    return page.evaluate((markup) => {
      // DOMParser is strict where innerHTML is forgiving, so malformed markup is
      // caught here rather than turning into a silently empty picture.
      const parsed = new DOMParser().parseFromString(markup, 'image/svg+xml')
      const failure = parsed.querySelector('parsererror')
      if (failure) return { parseError: failure.textContent.trim().slice(0, 300) }

      document.body.replaceChildren(parsed.documentElement)
      const root = document.body.firstElementChild
      let box
      try {
        box = root.getBBox()
      } catch {
        return { parseError: 'the drawing has no measurable contents' }
      }
      document.body.replaceChildren()
      return { box: { x: box.x, y: box.y, width: box.width, height: box.height } }
    }, svg)
  }

  async function shoot(svg, { width, height, background = shelf }) {
    const shot = await browser.newPage({ viewport: { width, height } })
    await shot.setContent(
      `<body style="margin:0;background:${background};display:grid;place-items:center">` +
        svg.replace('<svg ', `<svg width="${width}" height="${height}" `) +
        '</body>',
    )
    const png = await shot.screenshot()
    await shot.close()
    return png
  }

  /** A whole HTML page as one image — used for the contact sheet. */
  async function shootPage(html, { width, height }) {
    const sheet = await browser.newPage({ viewport: { width, height } })
    await sheet.setContent(html)
    const png = await sheet.screenshot({ fullPage: true })
    await sheet.close()
    return png
  }

  return {
    measure,
    shoot,
    shootPage,
    close: () => browser.close(),
  }
}

/**
 * Whether the ink fills enough of the frame to read as an object on a shelf,
 * and whether any of it escaped the frame. Coordinates are user units, so these
 * thresholds are the ones written down in house-style.md.
 */
export function framing(box) {
  const problems = []
  const bleeds =
    box.x < -0.5 ||
    box.y < -0.5 ||
    box.x + box.width > frame.width + 0.5 ||
    box.y + box.height > frame.height + 0.5

  if (bleeds) {
    problems.push(
      `spills outside the frame — its ink spans x ${box.x.toFixed(0)}–${(box.x + box.width).toFixed(0)}` +
        ` and y ${box.y.toFixed(0)}–${(box.y + box.height).toFixed(0)}, but everything must sit inside 0–160 by 0–220`,
    )
  }

  // A bottle is tall and narrow and a pizza box is wide and flat, so neither
  // dimension can be required on its own. What matters is that the drawing fills
  // the frame along whichever axis it runs, and is not a sliver across the other.
  const across = box.width / frame.width
  const down = box.height / frame.height
  const along = Math.max(across, down)
  const other = Math.min(across, down)

  if (along < 0.72) {
    problems.push(
      `is too small in the frame — it fills ${Math.round(across * 100)}% of the width and` +
        ` ${Math.round(down * 100)}% of the height, and its longer side needs at least 72%.` +
        ' Scale the whole drawing up so it nearly touches the frame along its longer axis.',
    )
  } else if (other < 0.35) {
    problems.push(
      `is a sliver — it fills only ${Math.round(other * 100)}% of the frame across its narrow axis,` +
        ' and needs at least 35%. Give the object some body.',
    )
  }

  const centre = box.x + box.width / 2
  if (Math.abs(centre - frame.width / 2) > 12) {
    problems.push(`is off-centre — its middle is at x ${centre.toFixed(0)}, and should be near x 80`)
  }

  return problems
}

/**
 * Whether a drawing has kept the proportions of the reference it was adapted
 * from. Illustrators drift: told to keep a squat jar and change only the label,
 * one returned a tall narrow bottle that was indistinguishable from the ketchup
 * beside it on the shelf. Nothing else in the pipeline noticed, because the file
 * was valid and well framed — it was simply the wrong package. Comparing the
 * aspect ratio of the ink against the reference's catches exactly that.
 */
export function proportion(box, referenceBox, referenceName) {
  const drawn = box.width / box.height
  const wanted = referenceBox.width / referenceBox.height
  const drift = Math.abs(drawn - wanted) / wanted
  if (drift <= 0.18) return []

  const shape = drawn < wanted ? 'narrower and taller' : 'wider and shorter'
  return [
    `is ${shape} than the ${referenceName} it was drawn from — its ink is ` +
      `${box.width.toFixed(0)}x${box.height.toFixed(0)} where the reference is ` +
      `${referenceBox.width.toFixed(0)}x${referenceBox.height.toFixed(0)}, a ${Math.round(drift * 100)}% ` +
      'change in proportion. Keep the reference\'s outline and change only what is printed on it.',
  ]
}
