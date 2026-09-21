// Which products have no shop-brand twin.
//
// A store brand is printing, and printing needs a package. There is no such
// thing as an own-label apple, a value-line salmon fillet, or a frugal version
// of the cake the shop's own bakery decorated this morning — those are sold
// loose, by weight, or straight from the counter. Pairing them with a "CG Value"
// twin put a choice on the shelf that does not exist in a real shop, and spent a
// student's attention on a comparison that teaches nothing.
//
// Everything listed here is drawn as bare food in a single layer, appears once
// in its aisle, and is left out of the store-brand line. Everything not listed
// is packaged, gets the printed-panel layers, and gets a twin.
//
// The generator in scripts/make-product-art.mjs reads this to decide how many
// layers to draw, and the catalog reads it to decide whether to shelve a twin.
//
// This is a judgement call about the shop, not a fact about the code — the
// borderline cases are the bakery counter and the meat counter, where the same
// food is sold both loose and in a packet. Edit the list and re-run the
// generator if you would shelve one of them differently.

export const unbranded = new Set([
  // Produce — all of it sold loose or by the piece.
  'apple', 'banana', 'grapes', 'strawberries', 'blueberries', 'oranges',
  'lettuce', 'tomato', 'carrots', 'watermelon', 'pineapple', 'avocado',
  'onion', 'pepper', 'corn', 'zucchini', 'potatoes', 'green-beans',

  // The fish counter. Canned tuna is a tin, so it stays packaged.
  'catfish', 'salmon', 'rainbow-trout', 'cod', 'tuna-steaks', 'tilapia',
  'lobster-tail', 'shrimp',

  // The meat counter: raw cuts, cut and wrapped in the shop. The cured and
  // processed things beside them — bacon, hot dogs, deli meat, sausages,
  // pepperoni, ham, meatballs — arrive already printed, and stay packaged.
  'ground-beef', 'steak', 'roast', 'pork-chops', 'chicken', 'chicken-tenders',
  'chicken-wings', 'lamb-chops', 'bison', 'turkey',

  // The in-store bakery. These are the shop's own baking already, which is why a
  // shop-brand version of them would be a twin of itself. Packaged bread, buns,
  // tortillas and crusts from the bread aisle are not in this list.
  'bakery-cake', 'bakery-pie', 'bakery-cookies', 'brownie', 'cookie-cake',
  'donut', 'cupcake', 'cinnamon-rolls', 'banana-bread', 'muffins',
])

export function isPackagedProduct(id: string) {
  return !unbranded.has(id)
}
