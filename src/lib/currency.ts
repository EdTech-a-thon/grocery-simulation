// The money a store prices in. Every catalog price is written in US dollars;
// a store in another currency starts from those prices converted at the rates
// below, so a teacher who switches to yen gets shelves that read like a
// Japanese shop rather than a page of ¥3.49.
//
// The rates are fixed on purpose. They were US dollar exchange rates on
// 5 October 2026 (exchangerate-api.com), and they only have to make the
// starting prices believable — a class lesson should not shift overnight
// because the yen did.

export type Currency = {
  /** The ISO 4217 code: 'EUR', 'JPY'... */
  code: string
  /** How much of this currency one US dollar buys. */
  perDollar: number
  /**
   * The smallest amount a shelf price there moves by. Converted prices are
   * rounded to it, so they read like that country's shelves: Swiss prices go
   * in 5 rappen, Chinese ones in tenths of a yuan, Korean ones in tens of won.
   */
  step: number
  /**
   * The round number a teacher can snap every price to, for easier sums: about
   * ten US cents' worth, as the nearest 1 or 5 — €0.10, ¥10, kr 10, ₩100.
   */
  roundTo: number
}

export const currencies: Currency[] = [
  { code: 'USD', perDollar: 1, step: 0.01, roundTo: 0.1 },
  { code: 'AED', perDollar: 3.6725, step: 0.05, roundTo: 0.5 },
  { code: 'ARS', perDollar: 1523.09, step: 10, roundTo: 100 },
  { code: 'AUD', perDollar: 1.4393, step: 0.01, roundTo: 0.1 },
  { code: 'BRL', perDollar: 5.2225, step: 0.01, roundTo: 0.5 },
  { code: 'CAD', perDollar: 1.4248, step: 0.01, roundTo: 0.1 },
  { code: 'CHF', perDollar: 0.8284, step: 0.05, roundTo: 0.1 },
  { code: 'CLP', perDollar: 987.99, step: 10, roundTo: 100 },
  { code: 'CNY', perDollar: 6.7104, step: 0.1, roundTo: 0.5 },
  { code: 'COP', perDollar: 3308.76, step: 50, roundTo: 500 },
  { code: 'CZK', perDollar: 21.733, step: 0.1, roundTo: 1 },
  { code: 'DKK', perDollar: 6.6474, step: 0.05, roundTo: 0.5 },
  { code: 'EGP', perDollar: 52.2475, step: 0.25, roundTo: 5 },
  { code: 'EUR', perDollar: 0.8889, step: 0.01, roundTo: 0.1 },
  { code: 'GBP', perDollar: 0.7557, step: 0.01, roundTo: 0.1 },
  { code: 'GHS', perDollar: 11.6173, step: 0.1, roundTo: 1 },
  { code: 'HKD', perDollar: 7.8476, step: 0.1, roundTo: 1 },
  { code: 'HUF', perDollar: 327.67, step: 10, roundTo: 50 },
  { code: 'IDR', perDollar: 17915.06, step: 100, roundTo: 1000 },
  { code: 'ILS', perDollar: 3.0448, step: 0.1, roundTo: 0.5 },
  { code: 'INR', perDollar: 96.4006, step: 1, roundTo: 10 },
  { code: 'ISK', perDollar: 121.9, step: 1, roundTo: 10 },
  { code: 'JMD', perDollar: 158.77, step: 1, roundTo: 10 },
  { code: 'JPY', perDollar: 157.73, step: 1, roundTo: 10 },
  { code: 'KES', perDollar: 129.58, step: 1, roundTo: 10 },
  { code: 'KRW', perDollar: 1344.61, step: 10, roundTo: 100 },
  { code: 'MAD', perDollar: 9.9195, step: 0.05, roundTo: 1 },
  { code: 'MXN', perDollar: 18.194, step: 0.1, roundTo: 1 },
  { code: 'MYR', perDollar: 4.0845, step: 0.05, roundTo: 0.5 },
  { code: 'NGN', perDollar: 1331.28, step: 10, roundTo: 100 },
  { code: 'NOK', perDollar: 9.6199, step: 0.1, roundTo: 1 },
  { code: 'NZD', perDollar: 1.7813, step: 0.01, roundTo: 0.1 },
  { code: 'PEN', perDollar: 3.4593, step: 0.1, roundTo: 0.5 },
  { code: 'PHP', perDollar: 62.6327, step: 0.25, roundTo: 5 },
  { code: 'PKR', perDollar: 277.49, step: 5, roundTo: 50 },
  { code: 'PLN', perDollar: 3.8955, step: 0.01, roundTo: 0.5 },
  { code: 'RON', perDollar: 4.7544, step: 0.01, roundTo: 0.5 },
  { code: 'SAR', perDollar: 3.75, step: 0.05, roundTo: 0.5 },
  { code: 'SEK', perDollar: 10.0418, step: 0.1, roundTo: 1 },
  { code: 'SGD', perDollar: 1.2794, step: 0.05, roundTo: 0.1 },
  { code: 'THB', perDollar: 33.5663, step: 1, roundTo: 5 },
  { code: 'TRY', perDollar: 49.1619, step: 0.25, roundTo: 5 },
  { code: 'TWD', perDollar: 31.8717, step: 1, roundTo: 5 },
  { code: 'UAH', perDollar: 45.1182, step: 0.1, roundTo: 5 },
  { code: 'VND', perDollar: 25949.12, step: 1000, roundTo: 5000 },
  { code: 'ZAR', perDollar: 16.6586, step: 0.01, roundTo: 1 },
]

const currencyByCode: Record<string, Currency> = Object.fromEntries(currencies.map((currency) => [currency.code, currency]))
const dollars = currencyByCode.USD

export function isCurrencyCode(value: unknown): value is string {
  return typeof value === 'string' && value in currencyByCode
}

export function currencyOf(code: string) {
  return currencyByCode[code] ?? dollars
}

/** Decimal places a price shows: two for cents, none where the step is a whole unit. */
export function decimalsOf(code: string) {
  return currencyOf(code).step < 1 ? 2 : 0
}

/**
 * Rounds to the currency's step, or to another amount such as its `roundTo`,
 * without the 0.1 + 0.2 crumbs floating point leaves.
 */
export function roundToStep(value: number, code: string, step = currencyOf(code).step) {
  return Number((Math.round(value / step) * step).toFixed(decimalsOf(code)))
}

/** Rounds to the currency's round number, but never down to nothing. */
export function roundToRoundNumber(value: number, code: string) {
  const { roundTo } = currencyOf(code)
  return Math.max(roundTo, roundToStep(value, code, roundTo))
}

/** A US dollar catalog price as a shelf in this currency would show it. */
export function fromDollars(value: number, code: string) {
  return roundToStep(value * currencyOf(code).perDollar, code)
}

/** Moves a price a teacher set from one currency to another at the fixed rates. */
export function convert(value: number, fromCode: string, toCode: string) {
  return roundToStep((value / currencyOf(fromCode).perDollar) * currencyOf(toCode).perDollar, toCode)
}

/**
 * The most a price or a money-off coupon may be: what $999 is worth, so a
 * yen store is not capped at ¥999.
 */
export function maxPrice(code: string) {
  return roundToStep(999 * currencyOf(code).perDollar, code)
}

// Numbers are always written the US way ($1,234.50, €3.00), whatever language
// the page is in, so a mixed-language class sees the same figures on the same
// shelf. The narrow symbol is the one a local shop prints: "kr", not "ISK".
function formatter(code: string, decimals = decimalsOf(code)) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: code,
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/**
 * `wholeWithoutCents` writes a whole amount as "Kč 76" rather than "Kč 76.00",
 * for round numbers and for stores rounded to whole units.
 */
export function formatMoney(value: number, code: string, wholeWithoutCents = false) {
  return formatter(code, wholeWithoutCents && Number.isInteger(value) ? 0 : undefined).format(value)
}

/** The sign that goes beside a price box: '$', '€', '¥', 'kr'... */
export function currencySymbol(code: string) {
  return formatter(code).formatToParts(0).find((part) => part.type === 'currency')?.value ?? code
}

/** The currency's own name in the page's language: "euro", "yen japonés"... */
export function currencyName(code: string, locale: string) {
  try {
    return new Intl.DisplayNames([locale], { type: 'currency' }).of(code) ?? code
  } catch {
    return code
  }
}

/**
 * The nearest price ending in 9 of the currency's step: $2.49, ¥439, ₩4,190,
 * or CHF 2.45 where the step is 5 rappen.
 * Every CG Value price goes through this, so the line reads like shelf pricing
 * instead of like arithmetic.
 */
export function priceEndingInNine(price: number, code = 'USD') {
  const step = currencyOf(code).step
  const tens = Math.max(0, Math.round((price - 9 * step) / (10 * step)))
  return roundToStep((tens * 10 + 9) * step, code)
}
