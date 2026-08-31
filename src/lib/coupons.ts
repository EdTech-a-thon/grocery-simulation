import { cart } from './cart.svelte'
import { money } from './catalog'
import { productById } from './products'
import type { Coupon } from './pocketbase'

export function formatCouponItem(coupon: Coupon) {
  return coupon.productId === 'all' ? 'entire purchase' : productById[coupon.productId]?.name ?? coupon.productId
}

export function formatDate(value: string) {
  return value ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'No limit'
}

export function couponCopies(coupon: Coupon) {
  return Math.min(100, Math.max(1, Math.round(coupon.copies || 1)))
}

export function couponDiscountLabel(coupon: Coupon) {
  return coupon.discountType === 'dollars'
    ? `${money(coupon.discountAmount)} off`
    : `${coupon.discountAmount}% off`
}

/** A coupon can never take off more than the items it applies to actually cost. */
export function discountFor(coupon: Coupon, eligibleTotal: number) {
  const raw = coupon.discountType === 'dollars'
    ? coupon.discountAmount
    : eligibleTotal * coupon.discountAmount / 100
  return Math.max(0, Math.min(raw, eligibleTotal))
}

/** Why this coupon cannot be used right now, or '' when it can. */
export function couponStatus(coupon: Coupon) {
  const now = Date.now()
  if (coupon.startsAt && now < new Date(coupon.startsAt).getTime()) return 'This coupon is not active yet.'
  if (coupon.endsAt && now > new Date(coupon.endsAt).getTime()) return 'This coupon has expired.'
  if (coupon.productId !== 'all' && !cart.lines.some((line) => line.id === coupon.productId)) {
    return `Add ${productById[coupon.productId]?.name ?? 'the coupon item'} to the cart first.`
  }
  return ''
}

// ---------------------------------------------------------------- barcodes

const code39Patterns: Record<string, string> = {
  '0':'nnnwwnwnn','1':'wnnwnnnnw','2':'nnwwnnnnw','3':'wnwwnnnnn','4':'nnnwwnnnw','5':'wnnwwnnnn','6':'nnwwwnnnn','7':'nnnwnnwnw','8':'wnnwnnwnn','9':'nnwwnnwnn',
  A:'wnnnnwnnw',B:'nnwnnwnnw',C:'wnwnnwnnn',D:'nnnnwwnnw',E:'wnnnwwnnn',F:'nnwnwwnnn',G:'nnnnnwwnw',H:'wnnnnwwnn',I:'nnwnnwwnn',J:'nnnnwwwnn',
  K:'wnnnnnnww',L:'nnwnnnnww',M:'wnwnnnnwn',N:'nnnnwnnww',O:'wnnnwnnwn',P:'nnwnwnnwn',Q:'nnnnnnwww',R:'wnnnnnwwn',S:'nnwnnnwwn',T:'nnnnwnwwn',
  U:'wwnnnnnnw',V:'nwwnnnnnw',W:'wwwnnnnnn',X:'nwnnwnnnw',Y:'wwnnwnnnn',Z:'nwwnwnnnn','-':'nwnnnnwnw','.':'wwnnnnwnn',' ':'nwwnnnwnn','$':'nwnwnwnnn','/':'nwnwnnnwn','+':'nwnnnwnwn','%':'nnnwnwnwn','*':'nwnnwnwnn',
}

const code39Characters = Object.fromEntries(
  Object.entries(code39Patterns).map(([character, pattern]) => [pattern, character]),
)

/** Reads one horizontal row of a photographed Code 39 barcode. */
export function readCode39Row(pixels: Uint8ClampedArray, width: number, row: number) {
  const brightness: number[] = []
  let darkest = 255
  let lightest = 0
  for (let x = 0; x < width; x += 1) {
    const offset = (row * width + x) * 4
    const value = (pixels[offset] * 299 + pixels[offset + 1] * 587 + pixels[offset + 2] * 114) / 1000
    brightness.push(value)
    darkest = Math.min(darkest, value)
    lightest = Math.max(lightest, value)
  }
  if (lightest - darkest < 80) return ''

  const threshold = (darkest + lightest) / 2
  const colors = brightness.map((value) => value < threshold)
  return decodeRuns(runLengths(colors), false) || decodeRuns(runLengths(colors.reverse()), true)
}

function runLengths(colors: boolean[]) {
  const runs: Array<{ black: boolean; width: number }> = []
  for (const black of colors) {
    const last = runs.at(-1)
    if (last?.black === black) last.width += 1
    else runs.push({ black, width: 1 })
  }
  return runs
}

function decodeRuns(runs: Array<{ black: boolean; width: number }>, reversed: boolean) {
  for (let start = 0; start + 8 < runs.length; start += 1) {
    if (!runs[start].black) continue
    let cursor = start
    let result = ''
    while (cursor + 8 < runs.length) {
      const characterRuns = runs.slice(cursor, cursor + 9)
      if (characterRuns.some((run, index) => run.black !== (index % 2 === 0))) break
      const widest = characterRuns.map((run) => run.width).sort((a, b) => b - a).slice(0, 3)
      const pattern = characterRuns.map((run) => widest.includes(run.width) ? 'w' : 'n').join('')
      const character = code39Characters[reversed ? [...pattern].reverse().join('') : pattern]
      if (!character) break
      if (character === '*') {
        if (result) return reversed ? [...result].reverse().join('') : result
        result = ''
      } else if (result || cursor > start) result += character
      cursor += 10 // nine bars/spaces plus the narrow gap between characters
      if (runs[cursor - 1]?.black || (runs[cursor - 1]?.width ?? Infinity) > characterRuns[0].width * 2.5) break
    }
  }
  return ''
}

/** The black bars of a Code 39 barcode, so a coupon can be scanned by camera. */
export function barcodeBars(code: string) {
  const encoded = `*${code.toUpperCase()}*`
  const bars: Array<{ x: number; width: number }> = []
  let x = 10
  for (const character of encoded) {
    const pattern = code39Patterns[character]
    if (!pattern) continue
    ;[...pattern].forEach((width, index) => {
      const pixels = width === 'w' ? 4 : 2
      if (index % 2 === 0) bars.push({ x, width: pixels })
      x += pixels
    })
    x += 2
  }
  return { bars, width: x + 8 }
}
