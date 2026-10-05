import { isStoreBrand, nameBrandIdOf } from './unbranded'

// How much is in each package, so a shopper can work out a unit price.
//
// Without a size, the cheaper sticker always looks like the better buy, and a
// class learns to grab the lowest number on the shelf — or, with CG Value
// beside every name brand, learns to grab CG every time. So the CG line comes
// in three kinds of package, about a third each:
//
//   - smaller: cheaper on the sticker, dearer per unit
//   - the same size: a little cheaper, both on the sticker and per unit
//   - bigger: dearer on the sticker, cheaper per unit
//
// Only the unit price tells a shopper which deal is which, and the bigger
// packages ask a second question: is the better deal worth the money now?
// storeBrandPrice() in products.ts sets each price from its package.
//
// A teacher can change any product's size for their own store; these are the
// sizes a store starts with. They are written in US customary units. A store
// set to metric stocks the nearest round metric package instead, 500 g rather
// than 18 oz, at the same price (see metricPackage). Either way the units read
// the same in every language.

export const usUnits = ['oz', 'fl oz', 'lb', 'gal'] as const
export const metricUnits = ['g', 'kg', 'mL', 'L'] as const
export const sizeUnits = [...usUnits, ...metricUnits, 'ct'] as const
export type SizeUnit = (typeof sizeUnits)[number]
export type PackageSize = { amount: number; unit: SizeUnit }

/** Which units a store's shelf tags use. */
export type Measure = 'us' | 'metric'

/** The units a teacher can pick from: a metric store has no use for ounces. */
export function unitsFor(measure: Measure): readonly SizeUnit[] {
  return measure === 'metric' ? [...metricUnits, 'ct'] : sizeUnits
}

export function isSizeUnit(value: unknown): value is SizeUnit {
  return sizeUnits.includes(value as SizeUnit)
}

/** Every name-brand product's package. The CG twin shares it unless listed below. */
const nameBrandSizes: Record<string, string> = {
  // Dried goods
  'cereal': '18 oz', 'granola': '12 oz', 'oatmeal': '10 ct', 'breakfast-bars': '8 ct',
  'protein-bars': '5 ct', 'pancake-mix': '32 oz', 'macaroni-and-cheese': '7.25 oz',
  'pasta': '16 oz', 'ramen-noodles': '3 oz', 'rice': '2 lb', 'boxed-mashed-potatoes': '13.3 oz',
  'bread-crumbs': '15 oz', 'raisins': '20 oz', 'seeds': '6 oz', 'tree-nuts-peanuts': '16 oz',

  // Canned goods
  'beans': '15.5 oz', 'soup': '10.75 oz', 'canned-vegetables': '15 oz', 'baked-beans': '28 oz',
  'chili': '15 oz', 'canned-spaghettios': '15.8 oz', 'apple-sauce': '24 oz', 'canned-fruit': '15 oz',

  // Sauces and condiments
  'pasta-sauce': '24 oz', 'alfredo-sauce': '15 oz', 'pickles': '24 oz', 'salad-dressing': '16 fl oz',
  'bbq-sauce': '18 oz', 'hot-sauce': '12 fl oz', 'ketchup': '32 oz', 'mayonnaise': '30 fl oz',
  'mustard': '14 oz', 'buffalo-sauce': '12 fl oz', 'salsa': '16 oz', 'teriyaki-sauce': '10 fl oz',
  'syrup': '24 fl oz', 'honey': '12 oz', 'jelly': '18 oz', 'peanut-butter': '28 oz',

  // Dairy and eggs
  'whipped-cream': '13 oz', 'refrigerated-biscuits': '8 ct', 'cheese-sticks': '12 ct',
  'cottage-cheese': '16 oz', 'margarine': '45 oz', 'almond-milk': '64 fl oz', 'milk': '1 gal',
  'soymilk': '32 fl oz', 'cheddar-cheese-slices': '8 oz', 'mozzarella-cheese': '8 oz',
  'yogurt': '6 oz', 'eggs': '12 ct', 'sour-cream': '16 oz', 'cream-cheese': '8 oz', 'butter': '8 oz',

  // Frozen foods
  'thin-crust-pizza': '10 oz', 'deluxe-pizza': '30 oz', 'frozen-lasagna': '96 oz', 'ravioli': '25 oz',
  'frozen-dinner': '9 oz', 'pizza-rolls': '90 ct', 'chicken-nuggets': '5 lb', 'waffles': '10 ct',
  'breakfast-sandwich': '4 ct', 'frozen-fries': '32 oz', 'frozen-dinner-rolls': '24 ct',
  'ice-cream': '48 fl oz', 'popsicles': '12 ct', 'frozen-vegetables': '16 oz',

  // Bakery: the shop's own baking is sold by the piece or the box
  'donut': '1 ct', 'cupcake': '1 ct', 'bakery-pie': '1 ct', 'bakery-cake': '1 ct',
  'english-muffins': '6 ct', 'pita-bread': '5 ct', 'bakery-cookies': '12 ct', 'brownie': '6 ct',
  'cookie-cake': '1 ct', 'banana-bread': '1 ct', 'cinnamon-rolls': '4 ct', 'bread': '20 oz',
  'hotdog-buns': '8 ct', 'hamburger-buns': '8 ct', 'dinner-rolls': '12 ct', 'tortillas': '10 ct',
  'taco-shells': '12 ct', 'bagels': '6 ct', 'muffins': '4 ct', 'pizza-crust': '2 ct',

  // Produce: by the piece, or by the pound
  'apple': '1 ct', 'banana': '1 ct', 'grapes': '1 lb', 'strawberries': '2 lb', 'blueberries': '11 oz',
  'oranges': '1 lb', 'lettuce': '1 ct', 'tomato': '1 lb', 'carrots': '2 lb', 'watermelon': '1 ct',
  'pineapple': '1 ct', 'avocado': '1 ct', 'onion': '1 lb', 'pepper': '1 ct', 'corn': '1 ct',
  'zucchini': '1 lb', 'potatoes': '5 lb', 'green-beans': '1 lb',

  // Meat
  'ground-beef': '1 lb', 'steak': '1 lb', 'roast': '2 lb', 'pork-chops': '1 lb', 'bacon': '12 oz',
  'sausage-patties': '8 ct', 'chicken': '5 lb', 'chicken-tenders': '1 lb', 'chicken-wings': '2 lb',
  'sausage-links': '16 oz', 'hot-dogs': '8 ct', 'pepperoni': '6 oz', 'deli-meat': '9 oz',
  'ham': '3 lb', 'turkey': '2 lb', 'meatballs': '32 oz', 'lamb-chops': '1 lb', 'bison': '1 lb',

  // Seafood
  'catfish': '1 lb', 'salmon': '0.5 lb', 'rainbow-trout': '1 lb', 'cod': '1 lb', 'tuna-steaks': '12 oz',
  'canned-tuna': '5 oz', 'tilapia': '1 lb', 'lobster-tail': '1 ct', 'shrimp': '2 lb',

  // Beverages
  'orangejuice': '52 fl oz', 'soda-can': '12 ct', 'soda-2l-bottle': '67.6 fl oz', 'water': '24 ct',
  'flavored-water': '16.9 fl oz', 'sparkling-water': '16.9 fl oz', 'apple-juice': '64 fl oz',
  'lemonade': '52 fl oz', 'cranberry-juice': '32 fl oz', 'energy-drink': '16 fl oz', 'coffee': '12 oz',
  'tea': '20 ct', 'sports-drink': '28 fl oz', 'drink-mix-powder': '10 ct', 'protein-shakes': '11 fl oz',

  // Snacks
  'potato-chips': '8 oz', 'tortilla-chips': '11 oz', 'crackers': '13.7 oz', 'popcorn': '3 ct',
  'pretzels': '16 oz', 'graham-crackers': '14.4 oz', 'cookies': '13 oz', 'snack-cakes': '8 ct',
  'cheese-crackers': '12.4 oz',

  // Baking essentials
  'flour': '5 lb', 'sugar': '4 lb', 'brown-sugar': '2 lb', 'powdered-sugar': '2 lb',
  'cake-mix': '15.25 oz', 'icing': '16 oz', 'chocolate-chips': '12 oz', 'baking-soda': '16 oz',
  'baking-powder': '8.1 oz', 'yeast': '3 ct', 'oil': '48 fl oz', 'marshmallows': '10 oz',
  'pie-filling': '21 oz', 'vanilla-extract': '2 fl oz', 'spices': '2 oz', 'brownie-mix': '18 oz',
  'jello': '3 oz', 'pudding-mix': '3.4 oz',
}

/**
 * The CG Value packages that differ from the name brand's, in the same unit.
 * Anything not listed here is the same size. Run `bun run check:sizes` after
 * editing to see every pair and how many of each kind there are.
 */
const storeBrandSizes: Record<string, string> = {
  // Smaller: cheaper on the sticker, dearer per unit. A few are only just worse
  // — cheese sticks, waffles, coffee, cookies — so rounding too early gets them
  // wrong.
  'cereal': '12 oz', 'oatmeal': '8 ct', 'breakfast-bars': '6 ct', 'rice': '1.5 lb',
  'boxed-mashed-potatoes': '8 oz', 'raisins': '12 oz', 'baked-beans': '16 oz', 'apple-sauce': '15 oz',
  'pasta-sauce': '16 oz', 'pickles': '16 oz', 'hot-sauce': '5 fl oz', 'ketchup': '20 oz',
  'salsa': '12 oz', 'syrup': '12 fl oz', 'jelly': '12 oz', 'peanut-butter': '16 oz',
  'cheese-sticks': '10 ct', 'margarine': '30 oz', 'cheddar-cheese-slices': '6 oz',
  'deluxe-pizza': '22 oz', 'frozen-lasagna': '60 oz', 'pizza-rolls': '50 ct', 'chicken-nuggets': '3 lb',
  'waffles': '8 ct', 'frozen-dinner-rolls': '12 ct', 'frozen-vegetables': '12 oz', 'bread': '16 oz',
  'tortillas': '8 ct', 'sausage-patties': '6 ct', 'deli-meat': '7 oz', 'ham': '2 lb', 'meatballs': '26 oz',
  'soda-can': '8 ct', 'apple-juice': '46 fl oz', 'coffee': '10 oz', 'potato-chips': '6 oz',
  'crackers': '9 oz', 'cookies': '11 oz', 'cheese-crackers': '7 oz', 'sugar': '2 lb',
  'chocolate-chips': '9 oz', 'oil': '32 fl oz', 'vanilla-extract': '1 fl oz',

  // Bigger: the family size, the club pack, the tub instead of the cup. Dearer
  // on the sticker, cheaper per unit.
  'granola': '18 oz', 'pancake-mix': '48 oz', 'pasta': '32 oz', 'tree-nuts-peanuts': '24 oz',
  'beans': '29 oz', 'soup': '22.6 oz', 'canned-fruit': '29 oz',
  'salad-dressing': '24 fl oz', 'bbq-sauce': '28 oz', 'mayonnaise': '48 fl oz', 'mustard': '20 oz',
  'honey': '24 oz', 'eggs': '18 ct', 'sour-cream': '24 oz', 'cottage-cheese': '24 oz',
  'almond-milk': '96 fl oz', 'mozzarella-cheese': '16 oz', 'yogurt': '32 oz', 'butter': '16 oz',
  'breakfast-sandwich': '8 ct', 'frozen-fries': '48 oz', 'ice-cream': '64 fl oz', 'popsicles': '24 ct',
  'english-muffins': '12 ct', 'hotdog-buns': '12 ct', 'hamburger-buns': '12 ct', 'bagels': '12 ct',
  'bacon': '24 oz', 'sausage-links': '24 oz', 'hot-dogs': '16 ct', 'canned-tuna': '12 oz',
  'orangejuice': '89 fl oz', 'water': '35 ct', 'lemonade': '89 fl oz', 'cranberry-juice': '64 fl oz',
  'tea': '40 ct', 'tortilla-chips': '18 oz', 'pretzels': '24 oz', 'popcorn': '6 ct',
  'flour': '10 lb', 'powdered-sugar': '4 lb', 'baking-soda': '32 oz', 'marshmallows': '16 oz',
}

/**
 * Metric packages chosen by hand, where the nearest round one would not do.
 * Any product not listed comes in the package metricPackage() picks. Keys are
 * product ids, so a CG Value package is listed under its own id.
 */
const metricSizes: Record<string, string> = {
  // Two loaves that would both round to 500 g, so the smaller CG loaf stays smaller.
  'bread': '600 g', 'bread-cg': '450 g',
  // The roundest package would leave these bigger CG ones dearer per unit.
  'almond-milk-cg': '3 L', 'canned-tuna-cg': '350 g',
  // The usual cup.
  'yogurt': '175 g',
}

/** '12.5 fl oz' -> { amount: 12.5, unit: 'fl oz' } */
function parseSize(text: string): PackageSize {
  const [amount, ...unit] = text.split(' ')
  return { amount: Number(amount), unit: unit.join(' ') as SizeUnit }
}

/**
 * How a CG package compares with the name brand's: 0.5 for half as much, 1 for
 * the same, 2 for twice as much. A product with no twin, or no size, is 1.
 */
export function storeBrandSizeRatio(nameBrandId: string) {
  const name = nameBrandSizes[nameBrandId]
  const twin = storeBrandSizes[nameBrandId]
  return name && twin ? parseSize(twin).amount / parseSize(name).amount : 1
}

/** The size a store starts with for a product, before any teacher changes it. */
export function catalogSize(productId: string, measure: Measure = 'us'): PackageSize | null {
  const nameBrandId = nameBrandIdOf(productId)
  const text = (isStoreBrand(productId) && storeBrandSizes[nameBrandId]) || nameBrandSizes[nameBrandId]
  if (!text) return null
  if (measure === 'metric' && metricSizes[productId]) return parseSize(metricSizes[productId])
  return inMeasure(parseSize(text), measure)
}

/** How many grams or millilitres one of each US unit holds. */
const metricPerUsUnit: Record<(typeof usUnits)[number], { amount: number; unit: 'g' | 'mL' }> = {
  'oz': { amount: 28.3495, unit: 'g' },
  'fl oz': { amount: 29.5735, unit: 'mL' },
  'lb': { amount: 453.592, unit: 'g' },
  'gal': { amount: 3785.41, unit: 'mL' },
}

/**
 * How close a metric package must be to the US one for the price to stay the
 * same: within 12%, it is roughly as much food for the money.
 */
export const metricTolerance = 0.12

/**
 * Round numbers a metric package is likely to hold, roundest first, as the
 * leading digits of any amount: 500 g, 250 g and 1 kg before 400 g, and those
 * before 150 g or 175 g.
 */
const roundness = [[1, 2.5, 5], [2, 3, 4, 7.5], [1.5, 6, 8], [1.25, 1.75, 2.25, 3.5, 4.5, 7, 9]]

/**
 * The package a metric store sells instead of a US one: the roundest amount
 * within metricTolerance of it, the nearest if two are as round. 18 oz is 510
 * g, so it comes as 500 g; 1 gal is 3.79 L, so 4 L.
 */
function metricPackage(exact: number) {
  const decade = 10 ** Math.floor(Math.log10(exact))
  for (const tier of roundness) {
    const near = tier
      .flatMap((digits) => [digits * decade / 10, digits * decade, digits * decade * 10])
      .filter((amount) => Math.abs(amount - exact) <= exact * metricTolerance)
      .sort((a, b) => Math.abs(a - exact) - Math.abs(b - exact))
    if (near.length) return near[0]
  }
  return Math.round(exact)
}

/**
 * A size in the store's units. In a metric store a US size becomes the round
 * metric package nearest it, and a thousand grams or millilitres or more is
 * written in kilograms or litres. Counts, and sizes already in the store's
 * units, stay as they are. A US store shows a metric size as typed, the way a
 * real one sells a 2 L bottle.
 */
export function inMeasure(size: PackageSize, measure: Measure): PackageSize {
  if (measure === 'us' || !(size.unit in metricPerUsUnit)) return size
  const per = metricPerUsUnit[size.unit as keyof typeof metricPerUsUnit]
  const amount = metricPackage(size.amount * per.amount)
  if (amount >= 1000) return { amount: amount / 1000, unit: per.unit === 'g' ? 'kg' : 'L' }
  return { amount, unit: per.unit }
}

/** The exact metric amount of a US size, in grams or millilitres, to see how far rounding moved it. */
export function exactMetricAmount(size: PackageSize) {
  const per = metricPerUsUnit[size.unit as keyof typeof metricPerUsUnit]
  return per ? size.amount * per.amount : null
}

/** A metric size in grams or millilitres, whatever unit it is written in. */
export function baseMetricAmount(size: PackageSize) {
  return size.unit === 'kg' || size.unit === 'L' ? size.amount * 1000 : size.amount
}

/** '18 oz', '1 gal', '12 ct', '510 g' */
export function formatSize(size: PackageSize) {
  return `${Number(size.amount.toFixed(2))} ${size.unit}`
}

/**
 * What a unit price is "per", and how many of those one unit holds. A gram of
 * almost anything costs under a cent, so metric is priced per 100 g or 100 mL,
 * as shelf tags in metric countries are; then a kilogram holds ten of them.
 */
const unitPriceBasis: Record<SizeUnit, { per: string; inOneUnit: number }> = {
  'oz': { per: 'oz', inOneUnit: 1 },
  'fl oz': { per: 'fl oz', inOneUnit: 1 },
  'lb': { per: 'lb', inOneUnit: 1 },
  'gal': { per: 'gal', inOneUnit: 1 },
  'ct': { per: 'ct', inOneUnit: 1 },
  'g': { per: '100 g', inOneUnit: 0.01 },
  'kg': { per: '100 g', inOneUnit: 10 },
  'mL': { per: '100 mL', inOneUnit: 0.01 },
  'L': { per: '100 mL', inOneUnit: 10 },
}

/** The amount a unit price is for: 'oz', 'ct', '100 g'... */
export function unitPriceBasisOf(unit: SizeUnit) {
  return unitPriceBasis[unit].per
}

/** Price divided by amount: dollars per ounce, per item, per 100 grams... */
export function unitPrice(price: number, size: PackageSize) {
  const amount = size.amount * unitPriceBasis[size.unit].inOneUnit
  return amount > 0 ? price / amount : 0
}

/** A unit price in dollars and cents ($0.27), like every other price. */
export function formatUnitPrice(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}
