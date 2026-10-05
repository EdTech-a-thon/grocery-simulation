# Class Grocery

A grocery-store simulation for practicing real-life grocery shopping: planning
meals, sticking to a budget, clipping coupons and comparing prices. Teachers set
up a store for each class — its prices, which products it stocks, and its printable
coupons. Students open the store's link and shop, then read an itemized receipt.

There are no accounts and no database. A store travels inside its own link, so
Class Grocery collects nothing about the teachers or students who use it.

## Running it locally

```bash
bun install
bun run dev    # the web app on http://localhost:8000
```

Teachers build stores at `/teacher`. Students arrive through a store's link.

## Store links

A store is a small object — its name, colour, brand line, shelf-tag, tax and coupon
settings, plus only the prices and stocking choices the teacher changed (see
`src/lib/store.ts`). To share it, that object is packed into one-letter keys,
compressed, and written into the link after the `#`:

```
https://classgrocery.com/shop#q1YqU7Iy1FHKU7JSCsrPz1UwMjBR8E0syk4tUaoFAA
                              ^ the whole store
```

Browsers never send the part after a `#` to any server, which is what lets the
site promise it never sees a store. A fresh store makes a link of about 70
characters; every changed price adds a few more.

- `/shop#…` is the **student link**. It opens the store and remembers it in the
  student's browser, so the front page takes them back to it next time.
- `/teacher#…` is the **teacher's page** for the same store. The address bar is
  kept up to date with every change, so bookmarking the page keeps the store for
  good, on any computer.
- **Your stores** is the list kept in the teacher's own browser
  (`src/lib/savedStores.svelte.ts`). Every store a teacher creates or imports
  goes on it, and saves itself again on every change. Clearing browser data
  empties the list, which is why the pages recommend a bookmark too.
- **Import store** takes a store link, or a file made with **Download file**
  (the packed store as JSON, `downloadStoreFile()` in `src/lib/sharing.ts`).

A student link is a snapshot. When a teacher changes prices after sharing, they
share a new link; students who opened the old one keep shopping the old store.

Links are untrusted input: `unpackStore()` drops unknown products, clamps
numbers and ignores anything malformed. A link that cannot be read at all shows
"That store link did not work".

## How the code is laid out

The app is SvelteKit, but it has no server of its own: `bun run build` writes a
plain folder of files to `dist/`, and everything happens in the browser.

| Path                  | What lives there                                                    |
| --------------------- | ------------------------------------------------------------------- |
| `src/routes/`         | `/` and `/shop` for students, `/teacher` for teachers.               |
| `src/lib/components/` | The screens and pieces they share — shelves, cart, print sheets.     |
| `src/lib/*.svelte.ts` | Shared state: the open store, the cart, the saved stores.            |
| `src/lib/*.ts`        | Plain logic with no screen attached: stores, links, coupons.         |
| `src/app.css`         | Every style in the app, in one file.                                 |
| `art/references/`     | One verified drawing per package format, adapted to draw products.   |
| `art/masters/`        | The layered source drawing for each product.                         |
| `scripts/product-art/`| The drawing pipeline: house style, checks, rendering.                |

## The product artwork

Every product tile is generated, and none of it is trusted on arrival.

A **master** in `art/masters/` is a layered drawing: `#item` is the package or the
bare food, `#label` is the blank printed panel, and `#brand` and `#brand-cg` are
two alternative faces for that panel. The two shipped files are cut from that one
drawing — `static/images/<id>.svg` keeps `#brand`, `static/images/cg/<id>.svg`
keeps `#brand-cg` — so a product and its Class Grocery twin share a silhouette
because they are literally the same paths. That is the point: an own-label package
is the same package printed more plainly, not a different product, and not the
name brand with a green stripe stacked under it.

Food sold loose — fruit, raw cuts, the shop's own bakery — has no printed panel,
so it is drawn in `#item` alone and has no twin at all. `src/lib/unbranded.ts` is
the list, and both the catalog and the pipeline read it.

A drawing is produced by adapting a **reference** in `art/references/`, one per
package format. This is the pipeline's central lesson, learned the hard way: a
small model handed a written description of a package ("a cone shoulder tapering
to a narrow neck") draws a rectangle, while the same model handed a working
squeeze bottle and asked to make it a ketchup bottle succeeds. References are
therefore the most load-bearing files here — a flaw in one propagates into every
product drawn from it, which is why they have their own checker.

Three gates stand between a drawing and the shop, cheapest first:

1. `scripts/product-art/validate.mjs` — the house style as code: layer structure,
   frame, shape count, colour values, and the rule that the CG face must be
   plainer than the name brand without being gutted.
2. `scripts/product-art/render.mjs` — measured in a real browser: whether the file
   parses at all, whether the ink actually fills the frame, and whether the
   drawing has kept its reference's proportions.
3. A look at the rendered tile, by something that can see it. Nothing above this
   line can tell whether a drawing reads as *soup*.

```sh
bun scripts/check-references.mjs        # the format references
bun scripts/check-product-art.mjs       # every master, plus a contact sheet
bun run images:ship                     # cut the shipped artwork from the masters
```

Both checkers write a contact sheet to `art/review/` and exit non-zero on
failure, so they can gate a commit. `scripts/make-product-art.mjs` drives the
whole loop against the Claude API when `ANTHROPIC_API_KEY` is set, judging with a
stronger model and redrawing rejects with the criticism attached.

## How the pieces fit together

**The 175-product catalog lives in the code** — `src/lib/products.ts` for the
products and `src/lib/aisles/*.json` for which aisle each one sits on. A store
records only what differs from it:

| Field      | What it holds                                                          |
| ---------- | ---------------------------------------------------------------------- |
| `prices`   | Prices the teacher changed. A CG item with no price follows its name brand. |
| `stocked`  | Products put on or taken off the shelves against what the brand line stocks. |
| `sizes`    | Package sizes the teacher changed. Everything else uses `src/lib/sizes.ts`. |
| `coupons`  | Code, percent or dollars off, and the product (or `all`) it applies to. |

Changing the brand line forgets the hand-stocked choices and keeps the prices.
Loose food — fruit, raw cuts, the bakery — has no CG twin, so it stays on the
shelves whichever line is stocked.

## Tests

`bun run test` drives a real browser through the whole thing. The web app must
already be running; point `BASE_URL` at it.

```bash
bun run typecheck   # svelte-check
bun run test        # playwright
```
