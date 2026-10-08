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
  /**
   * Where the currency is spent, for writing its prices the way shops there do:
   * 3,45 € in Germany, CHF 3.45 in Switzerland, 1 234,50 Kč in Prague. Where
   * the local script is not Latin, it is that country's English, so students
   * can read it: ¥550, not ￥550; E£3.45, not ٣٫٤٥ ج.م.
   */
  locale: string
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
   * ten US cents' worth, as the nearest 1 or 5 — 0,10 €, ¥10, 10 kr, ₩100.
   */
  roundTo: number
}

export const currencies: Currency[] = [
  { code: 'USD', locale: 'en-US', perDollar: 1, step: 0.01, roundTo: 0.1 },
  { code: 'AED', locale: 'en-AE', perDollar: 3.6725, step: 0.05, roundTo: 0.5 },
  { code: 'ARS', locale: 'es-AR', perDollar: 1523.09, step: 10, roundTo: 100 },
  { code: 'AUD', locale: 'en-AU', perDollar: 1.4393, step: 0.01, roundTo: 0.1 },
  { code: 'BRL', locale: 'pt-BR', perDollar: 5.2225, step: 0.01, roundTo: 0.5 },
  { code: 'CAD', locale: 'en-CA', perDollar: 1.4248, step: 0.01, roundTo: 0.1 },
  { code: 'CHF', locale: 'de-CH', perDollar: 0.8284, step: 0.05, roundTo: 0.1 },
  { code: 'CLP', locale: 'es-CL', perDollar: 987.99, step: 10, roundTo: 100 },
  { code: 'CNY', locale: 'zh-CN', perDollar: 6.7104, step: 0.1, roundTo: 0.5 },
  { code: 'COP', locale: 'es-CO', perDollar: 3308.76, step: 50, roundTo: 500 },
  { code: 'CZK', locale: 'cs-CZ', perDollar: 21.733, step: 0.1, roundTo: 1 },
  { code: 'DKK', locale: 'da-DK', perDollar: 6.6474, step: 0.05, roundTo: 0.5 },
  { code: 'EGP', locale: 'en-EG', perDollar: 52.2475, step: 0.25, roundTo: 5 },
  { code: 'EUR', locale: 'de-DE', perDollar: 0.8889, step: 0.01, roundTo: 0.1 },
  { code: 'GBP', locale: 'en-GB', perDollar: 0.7557, step: 0.01, roundTo: 0.1 },
  { code: 'GHS', locale: 'en-GH', perDollar: 11.6173, step: 0.1, roundTo: 1 },
  { code: 'HKD', locale: 'zh-HK', perDollar: 7.8476, step: 0.1, roundTo: 1 },
  { code: 'HUF', locale: 'hu-HU', perDollar: 327.67, step: 10, roundTo: 50 },
  { code: 'IDR', locale: 'id-ID', perDollar: 17915.06, step: 100, roundTo: 1000 },
  { code: 'ILS', locale: 'en-IL', perDollar: 3.0448, step: 0.1, roundTo: 0.5 },
  { code: 'INR', locale: 'en-IN', perDollar: 96.4006, step: 1, roundTo: 10 },
  { code: 'ISK', locale: 'is-IS', perDollar: 121.9, step: 1, roundTo: 10 },
  { code: 'JMD', locale: 'en-JM', perDollar: 158.77, step: 1, roundTo: 10 },
  { code: 'JPY', locale: 'en-JP', perDollar: 157.73, step: 1, roundTo: 10 },
  { code: 'KES', locale: 'en-KE', perDollar: 129.58, step: 1, roundTo: 10 },
  { code: 'KRW', locale: 'ko-KR', perDollar: 1344.61, step: 10, roundTo: 100 },
  { code: 'MAD', locale: 'fr-MA', perDollar: 9.9195, step: 0.05, roundTo: 1 },
  { code: 'MXN', locale: 'es-MX', perDollar: 18.194, step: 0.1, roundTo: 1 },
  { code: 'MYR', locale: 'ms-MY', perDollar: 4.0845, step: 0.05, roundTo: 0.5 },
  { code: 'NGN', locale: 'en-NG', perDollar: 1331.28, step: 10, roundTo: 100 },
  { code: 'NOK', locale: 'nb-NO', perDollar: 9.6199, step: 0.1, roundTo: 1 },
  { code: 'NZD', locale: 'en-NZ', perDollar: 1.7813, step: 0.01, roundTo: 0.1 },
  { code: 'PEN', locale: 'es-PE', perDollar: 3.4593, step: 0.1, roundTo: 0.5 },
  { code: 'PHP', locale: 'en-PH', perDollar: 62.6327, step: 0.25, roundTo: 5 },
  { code: 'PKR', locale: 'en-PK', perDollar: 277.49, step: 5, roundTo: 50 },
  { code: 'PLN', locale: 'pl-PL', perDollar: 3.8955, step: 0.01, roundTo: 0.5 },
  { code: 'RON', locale: 'ro-RO', perDollar: 4.7544, step: 0.01, roundTo: 0.5 },
  { code: 'SAR', locale: 'en-SA', perDollar: 3.75, step: 0.05, roundTo: 0.5 },
  { code: 'SEK', locale: 'sv-SE', perDollar: 10.0418, step: 0.1, roundTo: 1 },
  { code: 'SGD', locale: 'en-SG', perDollar: 1.2794, step: 0.05, roundTo: 0.1 },
  { code: 'THB', locale: 'th-TH', perDollar: 33.5663, step: 1, roundTo: 5 },
  { code: 'TRY', locale: 'tr-TR', perDollar: 49.1619, step: 0.25, roundTo: 5 },
  { code: 'TWD', locale: 'zh-TW', perDollar: 31.8717, step: 1, roundTo: 5 },
  { code: 'UAH', locale: 'uk-UA', perDollar: 45.1182, step: 0.1, roundTo: 5 },
  { code: 'VND', locale: 'vi-VN', perDollar: 25949.12, step: 1000, roundTo: 5000 },
  { code: 'ZAR', locale: 'en-ZA', perDollar: 16.6586, step: 0.01, roundTo: 1 },
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

// Prices are written the way the currency's own country writes them, whatever
// language the page is in, so a mixed-language class sees the same figures on
// the same shelf. The narrow symbol is the one a local shop prints: "kr", not
// "ISK". A teacher whose class writes the money another way (5,43 $ in Quebec,
// not $5.43) picks one of the money styles below instead. Every price on a
// shelf goes through here, so formatters are kept.
const formatters = new Map<string, Intl.NumberFormat>()

/**
 * Where the money styles come from: one locale for each common way of writing
 * an amount, so the teacher picks what the class writes rather than a country.
 * Spanish and Polish are left out because they drop the thousands separator
 * from 1234, which would look like a style of its own.
 */
export const moneyStyleLocales = ['en-US', 'de-DE', 'fr-FR', 'de-AT', 'de-CH', 'fr-CH', 'en-ZA']

/** Whether a store may write its prices in this locale's style: the empty string is the currency's own. */
export function isMoneyStyle(value: unknown): value is string {
  return value === '' || moneyStyleLocales.includes(value as string)
}

function formatter(code: string, decimals = decimalsOf(code), style = '') {
  const locale = style || currencyOf(code).locale
  const key = `${code}:${decimals}:${locale}`
  let format = formatters.get(key)
  if (!format) {
    format = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol',
      numberingSystem: 'latn',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
    formatters.set(key, format)
  }
  return format
}

/**
 * `wholeWithoutCents` writes a whole amount as "76 Kč" rather than "76,00 Kč",
 * for round numbers and for stores rounded to whole units. `style` is the
 * store's money style, a locale from moneyStyleLocales; left empty, the
 * currency is written as its own country writes it.
 */
export function formatMoney(value: number, code: string, wholeWithoutCents = false, style = '') {
  return formatter(code, wholeWithoutCents && Number.isInteger(value) ? 0 : undefined, style).format(value)
}

/** The sign that goes beside a price box: '$', '€', '¥', 'kr'... */
export function currencySymbol(code: string, style = '') {
  return formatter(code, undefined, style).formatToParts(0).find((part) => part.type === 'currency')?.value ?? code
}

/** Whether the sign comes after the number, as in 3,45 € or 425 kr. */
export function symbolAfterNumber(code: string, style = '') {
  const parts = formatter(code, undefined, style).formatToParts(1).map((part) => part.type)
  return parts.indexOf('currency') > parts.indexOf('integer')
}

/**
 * The ways a teacher can have this currency written, each shown as 1234.50
 * would read in it: the currency's own way first (style ''), then each other
 * style that reads differently. Styles that come out the same are offered once.
 */
export function moneyStylesFor(code: string) {
  const styles: Array<{ style: string; example: string }> = []
  for (const style of ['', ...moneyStyleLocales]) {
    const example = moneyStyleExample(code, style)
    if (!styles.some((other) => other.example === example)) styles.push({ style, example })
  }
  return styles
}

/**
 * The style moneyStylesFor() lists for a store's chosen one. A style picked
 * for another currency can write this one the same way as an earlier style,
 * and only that earlier one is listed.
 */
export function listedMoneyStyle(code: string, style: string) {
  const example = moneyStyleExample(code, style)
  return moneyStylesFor(code).find((option) => option.example === example)?.style ?? ''
}

function moneyStyleExample(code: string, style: string) {
  return formatMoney(decimalsOf(code) ? 1234.5 : 1234, code, false, style)
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
