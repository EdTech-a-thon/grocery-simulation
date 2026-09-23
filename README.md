# ClassGrocery

A grocery-store simulation for practicing real-life grocery shopping: planning
meals, sticking to a budget, clipping coupons and comparing prices. Teachers set
up a store for each class — its prices, which products it stocks, and its printable
coupons. Students join with a store code and shop, then read an itemized receipt.

## Running it locally

You need two processes: PocketBase (the database) and the web app.

```bash
# once, to fetch the pinned PocketBase build and install packages
./deploy/install-pocketbase.sh
bun install

# terminal 1 — the database
./pocketbase serve --hooksDir=pb_hooks --migrationsDir=pb_migrations

# terminal 2 — the web app on http://localhost:8000
bun run dev
```

The first time PocketBase starts it prints a link for creating an admin account,
and it applies everything in `pb_migrations/` on its own — there is no separate
"run the migrations" step.

Point the app at the database with `.env.local` (copy `.env.example`):

```
VITE_POCKETBASE_URL=http://127.0.0.1:8090
```

Teachers sign up at `/teacher`. Students join at `/` with a store code, or by
following a join link.

## Join codes

A store code is two halves — the teacher's class identifier, chosen once when
they sign up, and a short label they give each class:

```
OTTER  -  P3
^ the identifier, unique across the whole site
          ^ the label, unique only within that teacher
```

Making the identifier unique is what lets the label be something a teacher
already has in their head: a period number, a room, a class name. Two teachers
can both run a `P3` without ever knowing about each other, which the old
site-wide codes could not manage — the first teacher to claim `ROOM-204` claimed
it for everybody.

The dash is decoration. Codes are matched on `joinKey`, the two halves run
together in upper case, so `OTTER-P3`, `otterp3` and `Otter P3` all open the
same store. Teachers can also hand out a link — `/j/OTTERP3` — which opens the
store without the class typing anything.

The identifier cannot be changed once it is set, because every code and link
already given out is built from it. The `teachers` update rule enforces that, so
it holds even if the screen is bypassed.

## How the code is laid out

The app is SvelteKit, but it has no server of its own: `bun run build` writes a
plain folder of files to `dist/`, and the browser talks to PocketBase directly.

| Path                  | What lives there                                                    |
| --------------------- | ------------------------------------------------------------------- |
| `src/routes/`         | The two pages: `/` for students, `/teacher` for teachers.            |
| `src/lib/components/` | The screens and pieces they share — shelves, cart, print sheets.     |
| `src/lib/*.svelte.ts` | Shared state: the open store, the cart, the teacher's stores.        |
| `src/lib/*.ts`        | Plain logic with no screen attached: prices, coupons, join codes.    |
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
keeps `#brand-cg` — so a product and its ClassGrocery twin share a silhouette
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

The browser talks to PocketBase directly through its JS SDK — there is no backend
of our own in between. Who may read or change what is decided by PocketBase's
collection API Rules, not by checks in the app code, so a teacher can only ever
see their own stores.

**The 175-product catalog lives in the code, not the database** —
`src/lib/products.ts` for the products and `src/lib/aisles/*.json` for which aisle
each one sits on. PocketBase stores only what differs per store:

| Collection    | What it holds                                                        |
| ------------- | -------------------------------------------------------------------- |
| `teachers`    | Teacher accounts (email, password, and their class identifier).       |
| `stores`      | One per class: name, color, and the label half of its join code.     |
| `store_items` | Per-store price and stocking changes. No row means "stocked, at the catalog price". |
| `coupons`     | Per-store coupons. Codes are unique so they can be scanned as barcodes. |

Three things API Rules cannot express live in `pb_hooks/classgrocery.pb.js`:

- `GET /api/classgrocery/store/{joinCode}` — students have no account, so this is
  the one public read. Rules correctly hide every store from a signed-out visitor.
- `POST /api/classgrocery/stores/{id}/duplicate` — copies a store's items and
  coupons in a single transaction. The copy gets **new** coupon codes, so sheets
  printed for last term's class cannot be spent in the new one.
- Create and update hooks on `stores` work out `joinKey` from the owner's
  identifier and overwrite whatever the browser sent, so a teacher cannot claim a
  code outside their own identifier.

## Tests

`bun run test` drives a real browser through the whole thing. Both servers above
must already be running.

```bash
bun run typecheck   # svelte-check
bun run test        # playwright
```
