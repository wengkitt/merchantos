PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT NOT NULL UNIQUE,
  stock INTEGER NOT NULL DEFAULT 0,
  committed INTEGER NOT NULL DEFAULT 0,
  daily_sales INTEGER NOT NULL DEFAULT 0,
  batch_yield INTEGER NOT NULL DEFAULT 12,
  tone TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  customer TEXT NOT NULL,
  channel TEXT NOT NULL,
  product_id TEXT NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  total_cents INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('Ready','Packing','On hold','Shipped')),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ingredients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  stock REAL NOT NULL,
  reorder_level REAL NOT NULL,
  supplier_id TEXT
);

CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  lead_days INTEGER NOT NULL,
  rating REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS recipes (
  product_id TEXT NOT NULL REFERENCES products(id),
  ingredient_id TEXT NOT NULL REFERENCES ingredients(id),
  amount_per_batch REAL NOT NULL,
  PRIMARY KEY (product_id, ingredient_id)
);

CREATE TABLE IF NOT EXISTS production_plans (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK(status IN ('Draft','Approved')),
  rationale TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  approved_at TEXT
);

CREATE TABLE IF NOT EXISTS production_plan_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_id TEXT NOT NULL REFERENCES production_plans(id),
  product_id TEXT NOT NULL REFERENCES products(id),
  batches INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS purchase_drafts (
  id TEXT PRIMARY KEY,
  supplier_id TEXT NOT NULL REFERENCES suppliers(id),
  ingredient_id TEXT NOT NULL REFERENCES ingredients(id),
  quantity REAL NOT NULL,
  unit TEXT NOT NULL,
  estimated_cost_cents INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('Draft','Approved')),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  approved_at TEXT
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  detail TEXT NOT NULL,
  created_at TEXT NOT NULL
);

INSERT OR IGNORE INTO suppliers VALUES
  ('sup-harvest', 'Northern Harvest Supply', 2, 4.8),
  ('sup-matcha', 'Kumo Tea Imports', 4, 4.9),
  ('sup-cocoa', 'Straits Cocoa Trading', 3, 4.7);

INSERT OR IGNORE INTO products VALUES
  ('prod-matcha', 'Matcha Almond', 'PB-MA-08', 8, 17, 14, 12, '#69714c'),
  ('prod-seasalt', 'Sea Salt Chocolate', 'PB-SC-08', 15, 11, 24, 12, '#3d2925'),
  ('prod-double', 'Double Chocolate', 'PB-DC-08', 13, 8, 11, 12, '#2d2423'),
  ('prod-pecan', 'Pecan Chocolate', 'PB-PC-08', 34, 7, 8, 12, '#8d6752');

INSERT OR IGNORE INTO ingredients VALUES
  ('ing-butter', 'Cultured Butter', 'kg', 4.2, 5.0, 'sup-harvest'),
  ('ing-flour', 'Japanese Wheat Flour', 'kg', 18.5, 8.0, 'sup-harvest'),
  ('ing-chocolate', 'Belgian Dark Chocolate', 'kg', 6.8, 4.0, 'sup-cocoa'),
  ('ing-matcha', 'Uji Matcha', 'kg', 0.42, 0.5, 'sup-matcha'),
  ('ing-almond', 'Roasted Almonds', 'kg', 3.6, 2.0, 'sup-harvest'),
  ('ing-pecan', 'Selected Pecans', 'kg', 2.8, 1.5, 'sup-harvest');

INSERT OR IGNORE INTO recipes VALUES
  ('prod-matcha', 'ing-butter', 0.8), ('prod-matcha', 'ing-flour', 1.2), ('prod-matcha', 'ing-matcha', 0.12), ('prod-matcha', 'ing-almond', 0.5),
  ('prod-seasalt', 'ing-butter', 0.9), ('prod-seasalt', 'ing-flour', 1.2), ('prod-seasalt', 'ing-chocolate', 0.8),
  ('prod-double', 'ing-butter', 0.9), ('prod-double', 'ing-flour', 1.1), ('prod-double', 'ing-chocolate', 1.1),
  ('prod-pecan', 'ing-butter', 0.8), ('prod-pecan', 'ing-flour', 1.1), ('prod-pecan', 'ing-chocolate', 0.7), ('prod-pecan', 'ing-pecan', 0.6);

INSERT OR IGNORE INTO orders VALUES
  ('PB-1048', 'Aina Rahman', 'Website', 'prod-matcha', 3, 12600, 'On hold', '2026-08-25T04:30:00Z'),
  ('PB-1047', 'Wei Ling', 'Shopee', 'prod-seasalt', 2, 8400, 'Packing', '2026-08-27T00:20:00Z'),
  ('PB-1046', 'Faris Hakim', 'WhatsApp', 'prod-double', 1, 13800, 'Ready', '2026-08-27T02:15:00Z'),
  ('PB-1045', 'Samantha Lee', 'TikTok Shop', 'prod-double', 4, 16800, 'Shipped', '2026-08-26T02:00:00Z'),
  ('PB-1044', 'Nur Syafiqah', 'Walk-in', 'prod-pecan', 2, 8800, 'Ready', '2026-08-27T06:05:00Z'),
  ('PB-1043', 'Daniel Lim', 'Lazada', 'prod-seasalt', 5, 21000, 'On hold', '2026-08-24T09:30:00Z'),
  ('PB-1042', 'Mei Xin', 'Website', 'prod-matcha', 4, 16800, 'Packing', '2026-08-26T10:40:00Z'),
  ('PB-1041', 'Haziq Ismail', 'Shopee', 'prod-pecan', 2, 8800, 'Ready', '2026-08-26T12:00:00Z');

INSERT OR IGNORE INTO audit_logs (id, actor, action, detail, created_at) VALUES
  (1, 'System', 'Morning sync complete', '8 orders imported from 5 active sales channels', '2026-08-27T00:31:00Z'),
  (2, 'Agent', 'Stock risk detected', 'Matcha Almond cannot cover committed orders', '2026-08-27T00:32:00Z');
