# Sqiushy CRM

Shop desk for a small business that sells novelty squishy toys.

These are toys. Every product shows this fixed safety label, and the words cannot be edited in the app:

> Not edible. Contains toxic materials. Keep away from children and pets.

Do not describe a product as safe to eat, or safe to put on or in the body. Flavour is a scent name, not a food.

## Quick start

```bash
npm install
npm test
npm run dev
```

Open [http://localhost:5173/sqiushy_crm/](http://localhost:5173/sqiushy_crm/). The dev server uses the same `/sqiushy_crm/` base path as GitHub Pages.

## Demo mode

If `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` is missing, the app does not call Supabase. Products, customers, and orders stay in this browser under the localStorage key `sqiushy-crm-v1`.

The first visit loads sample products, customers, and orders. Sample rows are marked **Sample**. **Reset sample data** puts that shop back.

Sample products use the photos in `public/products/`:

| Toy | Flavour | Image |
| --- | --- | --- |
| Pickle Pete | sour apple | pickle-pete.jpg |
| Brain Freeze | blue raspberry | brain-freeze.jpg |
| Durian Don | durian | durian-don.jpg |
| Bubbles the Octopus | bubblegum | bubbles-octopus.jpg |

Copy `.env.example` to `.env.local` only when you want Supabase. Leave both values empty to stay in demo mode.

## Supabase

1. Create a Supabase project.
2. Open the SQL editor and run [`supabase/schema.sql`](supabase/schema.sql). That file creates `products`, `customers`, `orders`, and `order_items`, then turns on Row Level Security.
3. In Authentication, enable the Email provider. For a small team, turn off “Confirm email” so a new account can sign in immediately. If confirmation stays on, open the confirmation email before signing in.
4. In Project Settings → API, copy the project URL and the anon public key.
5. Create `.env.local`:

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

6. Restart `npm run dev`.
7. Create an account in the app and sign in.

Only signed-in users can read or write shop data. The anon key can live in the frontend because those policies do the blocking. Do not put the service role key in any `VITE_` variable.

A connected shop starts empty. Demo sample data is not copied into Supabase.

## What the desk does

- **Products:** name, flavour, size, colour, image, stock count, cost, and price in Malaysian ringgit (RM).
- **Customers:** name, phone, email, channel (Shopee, Instagram, TikTok Shop, In person, Other), notes, and order history.
- **Orders:** line items, totals, payment (unpaid, paid, refunded), and fulfilment (pending, packed, shipped, delivered, cancelled).
- Creating an order reduces stock. Cancelling puts it back. Deleting an order that is not cancelled also puts it back. A refund does not move stock; cancel the order if the toys come back.
- Opening a cancelled order again takes the toys out of stock, and fails if there is not enough.
- **Dashboard:** best-selling flavours, low-stock alerts (5 or fewer), and paid sales by month. Paid sales are orders marked paid that are not cancelled.
- Search and filters on each list. **Export CSV** downloads the rows that match the current search and filters.

## Scripts

- `npm run dev` — local desk
- `npm test` — stock and totals tests
- `npm run build` — production build, including a `404.html` copy so GitHub Pages can open deep links
- `npm run preview` — serve the build

## GitHub Pages

[`.github/workflows/pages.yml`](.github/workflows/pages.yml) runs the tests, builds the app in demo mode (the Supabase variables are left empty), and deploys to GitHub Pages.

The site base path is `/sqiushy_crm/`.

Manual step: in the repository **Settings → Pages**, set **Source** to **GitHub Actions**. The site updates when a push to `main` runs the workflow.

The Pages site is the demo. Each visitor’s changes stay in their own browser.

## Tests

`npm test` covers stock changes (create, cancel, cancel twice, reopen, refund, delete), order totals, the sample shop’s stock and monthly sales, and the fixed safety label.
