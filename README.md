# Fresh Mart Classroom

A grocery-store simulation for practising real-life shopping maths. Teachers set
up a store for each class — its prices, which products it stocks, and its printable
coupons. Students join with a store code and shop, then read an itemised receipt.

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

Teachers sign up at `/teacher`. Students join at `/` with a store code.

## How the pieces fit together

The browser talks to PocketBase directly through its JS SDK — there is no backend
of our own in between. Who may read or change what is decided by PocketBase's
collection API Rules, not by checks in the app code, so a teacher can only ever
see their own stores.

**The 175-product catalogue lives in the code, not the database** —
`src/products.ts` for the products and `src/aisles/*.json` for which aisle each
one sits on. PocketBase stores only what differs per store:

| Collection    | What it holds                                                        |
| ------------- | -------------------------------------------------------------------- |
| `teachers`    | Teacher accounts (email and password).                                |
| `stores`      | One per class: name, colour, and the code students type to join.      |
| `store_items` | Per-store price and stocking changes. No row means "stocked, at the catalogue price". |
| `coupons`     | Per-store coupons. Codes are unique so they can be scanned as barcodes. |

Two things API Rules cannot express live in `pb_hooks/freshmart.pb.js`:

- `GET /api/freshmart/store/{joinCode}` — students have no account, so this is
  the one public read. Rules correctly hide every store from a signed-out visitor.
- `POST /api/freshmart/stores/{id}/duplicate` — copies a store's items and
  coupons in a single transaction. The copy gets **new** coupon codes, so sheets
  printed for last term's class cannot be spent in the new one.

## Tests

`bun run test` drives a real browser through the whole thing. Both servers above
must already be running.

```bash
bun run typecheck   # tsc
bun run test        # playwright
```
