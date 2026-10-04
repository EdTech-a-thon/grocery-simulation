import { isStoreBrand, nameBrandIdOf } from './products'

// How much is in each package, so a shopper can work out a unit price.
//
// Without a size, the cheaper sticker always looks like the better buy, and a
// class learns to grab the lowest number on the shelf. A real store brand is
// often cheaper *and* smaller: the box costs less, but each ounce costs more.
// So a CG Value twin comes in the same size as the name brand unless it is
// listed in `storeBrandSizes` below, where its package is smaller — cheaper on
// the sticker, dearer per unit. That gives students both kinds of comparison
// on the same shelf, and only arithmetic tells them which is which.
//
// A teacher can change any product's size for their own store; these are the
// sizes a store starts with. The units are US customary, like the dollars, and
// read the same in every language.

export const sizeUnits = ['oz', 'fl oz', 'lb', 'gal', 'ct'] as const
export type SizeUnit = (typeof sizeUnits)[number]
export type PackageSize = { amount: number; unit: SizeUnit }

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
  'soymilk': '64 fl oz', 'cheddar-cheese-slices': '8 oz', 'mozzarella-cheese': '8 oz',
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
  'flavored-water': '16.9 fl oz', 'sparkling-water': '33.8 fl oz', 'apple-juice': '64 fl oz',
  'lemonade': '52 fl oz', 'cranberry-juice': '64 fl oz', 'energy-drink': '16 fl oz', 'coffee': '12 oz',
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
 * The CG Value packages that are smaller than the name brand's. Each one is
 * cheaper on the sticker but costs more per unit. A few are only just worse —
 * cheese sticks, waffles, coffee, cookies — so rounding too early gets them
 * wrong. Run `bun run check:sizes` after editing to see the list.
 */
const storeBrandSizes: Record<string, string> = {
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
  'chocolate-chips': '10 oz', 'oil': '32 fl oz', 'vanilla-extract': '1 fl oz',
}

/** '12.5 fl oz' -> { amount: 12.5, unit: 'fl oz' } */
function parseSize(text: string): PackageSize {
  const [amount, ...unit] = text.split(' ')
  return { amount: Number(amount), unit: unit.join(' ') as SizeUnit }
}

/** The size a store starts with for a product, before any teacher changes it. */
export function catalogSize(productId: string): PackageSize | null {
  const nameBrandId = nameBrandIdOf(productId)
  const text = (isStoreBrand(productId) && storeBrandSizes[nameBrandId]) || nameBrandSizes[nameBrandId]
  return text ? parseSize(text) : null
}

/** '18 oz', '1 gal', '12 ct' */
export function formatSize(size: PackageSize) {
  return `${Number(size.amount.toFixed(2))} ${size.unit}`
}

/** Price divided by amount: dollars per ounce, per pound, per item... */
export function unitPrice(price: number, size: PackageSize) {
  return size.amount > 0 ? price / size.amount : 0
}

/**
 * Real shelf tags show a unit price under a dollar to a tenth of a cent
 * ($0.266), because two brands are often only that far apart. A dollar or more
 * is shown in plain cents ($4.10). Always US dollars, like every other price.
 */
export function formatUnitPrice(value: number) {
  const digits = value < 1 ? 3 : 2
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: digits, maximumFractionDigits: digits,
  }).format(value)
}
