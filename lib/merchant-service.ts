import type {
  AuditEntry,
  Ingredient,
  OperationsData,
  Order,
  OrderStatus,
  Product,
  ProductionPlan,
  PurchaseDraft,
} from "@/lib/merchant-data";

const now = () => new Date().toISOString();
const makeId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

async function audit(
  db: D1Database,
  actor: "Human" | "Agent" | "System",
  action: string,
  detail: string,
) {
  await db
    .prepare("INSERT INTO audit_logs (actor, action, detail, created_at) VALUES (?, ?, ?, ?)")
    .bind(actor, action, detail, now())
    .run();
}

export async function getOperationsData(db: D1Database): Promise<OperationsData> {
  const [productRows, orderRows, ingredientRows, planRows, planItemRows, purchaseRows, auditRows] =
    await Promise.all([
      db
        .prepare(
          "SELECT id, name, sku, stock, committed, daily_sales, batch_yield, tone FROM products ORDER BY rowid",
        )
        .all(),
      db
        .prepare(
          "SELECT o.id, o.customer, o.channel, o.product_id, p.name product_name, o.quantity, o.total_cents, o.status, o.created_at FROM orders o JOIN products p ON p.id=o.product_id ORDER BY o.created_at DESC",
        )
        .all(),
      db
        .prepare(
          "SELECT i.id, i.name, i.unit, i.stock, i.reorder_level, i.supplier_id, s.name supplier_name FROM ingredients i JOIN suppliers s ON s.id=i.supplier_id ORDER BY i.name",
        )
        .all(),
      db
        .prepare(
          "SELECT id, status, rationale, created_by, created_at, approved_at FROM production_plans ORDER BY created_at DESC",
        )
        .all(),
      db
        .prepare(
          "SELECT pi.plan_id, pi.product_id, p.name product_name, pi.batches FROM production_plan_items pi JOIN products p ON p.id=pi.product_id ORDER BY pi.id",
        )
        .all(),
      db
        .prepare(
          "SELECT d.id, d.supplier_id, s.name supplier_name, d.ingredient_id, i.name ingredient_name, d.quantity, d.unit, d.estimated_cost_cents, d.status, d.created_by, d.created_at FROM purchase_drafts d JOIN suppliers s ON s.id=d.supplier_id JOIN ingredients i ON i.id=d.ingredient_id ORDER BY d.created_at DESC",
        )
        .all(),
      db
        .prepare(
          "SELECT id, actor, action, detail, created_at FROM audit_logs ORDER BY id DESC LIMIT 12",
        )
        .all(),
    ]);
  const products: Product[] = productRows.results.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    sku: String(r.sku),
    stock: Number(r.stock),
    committed: Number(r.committed),
    dailySales: Number(r.daily_sales),
    batchYield: Number(r.batch_yield),
    tone: String(r.tone),
  }));
  const orders: Order[] = orderRows.results.map((r) => ({
    id: String(r.id),
    customer: String(r.customer),
    channel: String(r.channel),
    productId: String(r.product_id),
    productName: String(r.product_name),
    quantity: Number(r.quantity),
    items: `${r.product_name} × ${r.quantity}`,
    total: Number(r.total_cents) / 100,
    status: String(r.status) as OrderStatus,
    createdAt: String(r.created_at),
  }));
  const ingredients: Ingredient[] = ingredientRows.results.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    unit: String(r.unit),
    stock: Number(r.stock),
    reorderLevel: Number(r.reorder_level),
    supplierId: String(r.supplier_id),
    supplierName: String(r.supplier_name),
  }));
  const productionPlans: ProductionPlan[] = planRows.results.map((r) => ({
    id: String(r.id),
    status: String(r.status) as "Draft" | "Approved",
    rationale: String(r.rationale),
    createdBy: String(r.created_by),
    createdAt: String(r.created_at),
    approvedAt: r.approved_at ? String(r.approved_at) : undefined,
    items: planItemRows.results
      .filter((i) => i.plan_id === r.id)
      .map((i) => ({
        productId: String(i.product_id),
        productName: String(i.product_name),
        batches: Number(i.batches),
      })),
  }));
  const purchaseDrafts: PurchaseDraft[] = purchaseRows.results.map((r) => ({
    id: String(r.id),
    supplierId: String(r.supplier_id),
    supplierName: String(r.supplier_name),
    ingredientId: String(r.ingredient_id),
    ingredientName: String(r.ingredient_name),
    quantity: Number(r.quantity),
    unit: String(r.unit),
    estimatedCost: Number(r.estimated_cost_cents) / 100,
    status: String(r.status) as "Draft" | "Approved",
    createdBy: String(r.created_by),
    createdAt: String(r.created_at),
  }));
  const auditEntries: AuditEntry[] = auditRows.results.map((r) => ({
    id: Number(r.id),
    actor: String(r.actor),
    action: String(r.action),
    detail: String(r.detail),
    createdAt: String(r.created_at),
  }));
  return {
    merchant: { name: "Pinang Batchworks", location: "George Town, Penang" },
    metrics: {
      queueValue: orders.reduce((sum, order) => sum + order.total, 0),
      orders: orders.length,
      awaitingFulfillment: orders.filter((o) => o.status !== "Shipped").length,
      readyToShip: orders.filter((o) => o.status === "Ready").length,
      needsAttention: products.filter((p) => p.stock - p.committed <= p.dailySales).length,
    },
    orders,
    products,
    ingredients,
    productionPlans,
    purchaseDrafts,
    audit: auditEntries,
  };
}

export async function updateOrderStatus(
  db: D1Database,
  orderId: string,
  status: OrderStatus,
  actor: "Human" | "Agent",
) {
  const allowed: OrderStatus[] = ["Ready", "Packing", "On hold", "Shipped"];
  if (!allowed.includes(status)) throw new Error("Unsupported order status");
  const found = await db
    .prepare("SELECT id FROM orders WHERE lower(id)=lower(?)")
    .bind(orderId)
    .first();
  if (!found) throw new Error(`Order ${orderId} was not found`);
  await db.prepare("UPDATE orders SET status=? WHERE id=?").bind(status, found.id).run();
  await audit(db, actor, "Order status updated", `${found.id} changed to ${status}`);
  return { id: found.id, status };
}

export async function receiveInventory(
  db: D1Database,
  productId: string,
  quantity: number,
  actor: "Human" | "Agent",
) {
  if (!Number.isFinite(quantity) || quantity <= 0) throw new Error("Quantity must be positive");
  const product = await db.prepare("SELECT name FROM products WHERE id=?").bind(productId).first();
  if (!product) throw new Error("Product was not found");
  await db.prepare("UPDATE products SET stock=stock+? WHERE id=?").bind(quantity, productId).run();
  await audit(
    db,
    actor,
    "Finished goods received",
    `${product.name} increased by ${quantity} packs`,
  );
  return { productId, quantity };
}

export async function analyzeFulfillmentRisk(db: D1Database) {
  const data = await getOperationsData(db);
  const risks = data.products
    .filter((p) => p.stock - p.committed < p.dailySales)
    .map((p) => ({
      productId: p.id,
      product: p.name,
      stock: p.stock,
      committed: p.committed,
      dailyDemand: p.dailySales,
      shortfall: Math.max(0, p.committed - p.stock),
      recommendedBatches: Math.max(
        1,
        Math.ceil((p.committed + p.dailySales - p.stock) / p.batchYield),
      ),
      affectedOrders: data.orders
        .filter((o) => o.productId === p.id && o.status !== "Shipped")
        .map((o) => o.id),
    }));
  return {
    risks,
    recommendation:
      "Create a draft production plan, verify ingredient coverage, then prepare purchase drafts for projected ingredient gaps.",
  };
}

export async function createOperationsDraft(db: D1Database, actor: "Human" | "Agent") {
  const existing = await db
    .prepare(
      "SELECT id FROM production_plans WHERE status='Draft' ORDER BY created_at DESC LIMIT 1",
    )
    .first();
  if (existing) {
    const drafts = await db
      .prepare("SELECT id FROM purchase_drafts WHERE status='Draft' ORDER BY created_at")
      .all();
    return {
      productionPlanId: String(existing.id),
      purchaseDraftIds: drafts.results.map((row) => String(row.id)),
      requiresHumanApproval: true,
      reusedExistingDraft: true,
    };
  }
  const risk = await analyzeFulfillmentRisk(db);
  const planId = makeId("PLAN");
  const createdAt = now();
  await db
    .prepare(
      "INSERT INTO production_plans (id,status,rationale,created_by,created_at) VALUES (?, 'Draft', ?, ?, ?)",
    )
    .bind(
      planId,
      "Prioritises committed orders while retaining one day of demand cover.",
      actor,
      createdAt,
    )
    .run();
  for (const item of risk.risks)
    await db
      .prepare("INSERT INTO production_plan_items (plan_id,product_id,batches) VALUES (?,?,?)")
      .bind(planId, item.productId, item.recommendedBatches)
      .run();
  const requirements = await db
    .prepare(
      "SELECT r.ingredient_id, i.name, i.unit, i.stock, i.reorder_level, i.supplier_id, SUM(r.amount_per_batch * ppi.batches) required FROM production_plan_items ppi JOIN recipes r ON r.product_id=ppi.product_id JOIN ingredients i ON i.id=r.ingredient_id WHERE ppi.plan_id=? GROUP BY r.ingredient_id",
    )
    .bind(planId)
    .all();
  const purchaseDrafts: string[] = [];
  const unitCosts: Record<string, number> = {
    "ing-butter": 4600,
    "ing-matcha": 68000,
    "ing-chocolate": 5400,
    "ing-flour": 900,
    "ing-almond": 4200,
    "ing-pecan": 5800,
  };
  for (const row of requirements.results) {
    const projected = Number(row.stock) - Number(row.required);
    if (projected >= Number(row.reorder_level)) continue;
    const quantity = Math.ceil((Number(row.reorder_level) - projected) * 10) / 10;
    const draftId = makeId(`PO${purchaseDrafts.length + 1}`);
    const cost = Math.round(quantity * (unitCosts[String(row.ingredient_id)] ?? 3000));
    await db
      .prepare(
        "INSERT INTO purchase_drafts (id,supplier_id,ingredient_id,quantity,unit,estimated_cost_cents,status,created_by,created_at) VALUES (?,?,?,?,?,?,'Draft',?,?)",
      )
      .bind(draftId, row.supplier_id, row.ingredient_id, quantity, row.unit, cost, actor, createdAt)
      .run();
    purchaseDrafts.push(draftId);
  }
  await audit(
    db,
    actor,
    "Operations draft prepared",
    `${planId} created with ${risk.risks.length} production items and ${purchaseDrafts.length} purchase drafts`,
  );
  return {
    productionPlanId: planId,
    purchaseDraftIds: purchaseDrafts,
    requiresHumanApproval: true,
  };
}

export async function approveProductionPlan(db: D1Database, planId: string) {
  const plan = await db
    .prepare("SELECT status FROM production_plans WHERE id=?")
    .bind(planId)
    .first();
  if (!plan) throw new Error("Production plan was not found");
  if (plan.status !== "Approved") {
    await db
      .prepare("UPDATE production_plans SET status='Approved', approved_at=? WHERE id=?")
      .bind(now(), planId)
      .run();
    await audit(db, "Human", "Production plan approved", `${planId} approved for the kitchen team`);
  }
  return { id: planId, status: "Approved" };
}

export async function approvePurchaseDraft(db: D1Database, draftId: string) {
  const draft = await db
    .prepare("SELECT status FROM purchase_drafts WHERE id=?")
    .bind(draftId)
    .first();
  if (!draft) throw new Error("Purchase draft was not found");
  if (draft.status !== "Approved") {
    await db
      .prepare("UPDATE purchase_drafts SET status='Approved', approved_at=? WHERE id=?")
      .bind(now(), draftId)
      .run();
    await audit(
      db,
      "Human",
      "Purchase draft approved",
      `${draftId} approved; supplier dispatch remains outside this demo`,
    );
  }
  return { id: draftId, status: "Approved" };
}
