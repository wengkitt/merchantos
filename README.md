# MerchantOS

MerchantOS is a WebMCP-enabled operations workspace for independent merchants. The demo follows **Pinang Batchworks**, a fictional Penang cookie studio selling through several channels.

Instead of making an owner inspect orders, stock, recipes, ingredients and suppliers separately, MerchantOS exposes structured browser tools that let an agent investigate risks and prepare coordinated actions inside the same visible workspace.

## The human + agent workflow

Ask a compatible browser agent:

> Find orders at risk, explain why, and recommend how to fulfil them without causing tomorrow's stockout.

The agent can:

1. Inspect the persisted order queue and finished-goods inventory.
2. Identify affected products and orders.
3. Calculate production batches using demand and batch yield.
4. Inspect ingredient coverage and assigned suppliers.
5. Create a visible draft production plan and purchase drafts.
6. Hand control back to the owner for explicit approval.

Approvals are deliberately not exposed as WebMCP tools. The owner completes them in the visible interface, and every human or agent action is recorded in a persistent audit trail.

## WebMCP tools

- `get_business_snapshot`
- `analyze_fulfillment_risk`
- `get_orders`
- `get_inventory`
- `get_ingredient_coverage`
- `prepare_operations_draft`
- `update_order_status`
- `show_workspace_view`

Tools are registered in [`components/merchant-dashboard.tsx`](components/merchant-dashboard.tsx). Persistent business operations live in [`lib/merchant-service.ts`](lib/merchant-service.ts), and both the normal UI and WebMCP use the same route and service layer.

## Stack

- vinext / React / TypeScript
- Tailwind CSS
- Cloudflare Workers
- Cloudflare D1
- WebMCP (`document.modelContext.registerTool`)
- pnpm

## Run locally

Requirements: Node.js, pnpm and a Cloudflare account authenticated through Wrangler.

```bash
pnpm install
pnpm run cf-typegen
pnpm exec wrangler d1 migrations apply merchantos-db --local
pnpm run dev
```

Open `http://localhost:3000`.

## Test WebMCP

Use ChatGPT's in-app browser, which supports WebMCP, or Chrome 149+ with `chrome://flags/#enable-webmcp-testing` enabled.

Open the app and try:

> Give me the business snapshot, investigate fulfillment risks, and show me the ingredient coverage. Do not create any actions yet.

Then:

> Prepare the coordinated operations draft for me to review.

Expected result: the agent creates a production plan and any required purchase drafts, then MerchantOS visibly navigates to **Action review**. The owner must approve the drafts manually.

## Database

The schema and fictional demonstration data are defined in [`migrations/0001_initial.sql`](migrations/0001_initial.sql). It includes orders, products, ingredients, recipes, suppliers, production plans, purchase drafts and audit logs.

Apply migrations to production with:

```bash
pnpm exec wrangler d1 migrations apply merchantos-db --remote
```

## Build and deploy

```bash
pnpm run build
pnpm run deploy
```

## Fictional-data notice

Pinang Batchworks, its customers, suppliers, orders and operational records are entirely fictional and created for this demonstration. MerchantOS is not affiliated with any real cookie merchant.

## License

MIT — see [`LICENSE`](LICENSE).
