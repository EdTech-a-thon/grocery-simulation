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
