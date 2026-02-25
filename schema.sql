-- SQL Schema for Retail Finance Pro
-- Run this in your Supabase SQL Editor

-- 1. Categories
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    allocated_capital NUMERIC(20, 2) DEFAULT 0,
    retained_earnings NUMERIC(20, 2) DEFAULT 0,
    revenue NUMERIC(20, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Inventory
CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    cost_price NUMERIC(20, 2) NOT NULL,
    selling_price NUMERIC(20, 2) NOT NULL,
    current_stock INTEGER DEFAULT 0,
    minimum_stock INTEGER DEFAULT 10,
    category_id UUID REFERENCES categories(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Sales
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    total_revenue NUMERIC(20, 2) NOT NULL,
    total_cost NUMERIC(20, 2) NOT NULL,
    gross_profit NUMERIC(20, 2) NOT NULL,
    reversed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Sale Items
CREATE TABLE sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
    inventory_id UUID REFERENCES inventory(id),
    quantity INTEGER NOT NULL,
    price NUMERIC(20, 2) NOT NULL,
    cost NUMERIC(20, 2) NOT NULL,
    profit NUMERIC(20, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Expenses
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amount NUMERIC(20, 2) NOT NULL,
    expense_type TEXT CHECK (expense_type IN ('operating', 'stock_purchase')),
    category_id UUID REFERENCES categories(id),
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Distributions
CREATE TABLE distributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amount NUMERIC(20, 2) NOT NULL,
    distributed_to TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Sales Archive
CREATE TABLE sales_archive (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_sale_id UUID,
    archived_at TIMESTAMPTZ DEFAULT now(),
    reason TEXT
);

-- 8. Ledger (Double-Entry)
CREATE TABLE ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_id UUID NOT NULL,
    reference_type TEXT NOT NULL,
    account_debited TEXT NOT NULL,
    account_credited TEXT NOT NULL,
    amount NUMERIC(20, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Capital Structure
CREATE TABLE capital_structure (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_equity NUMERIC(20, 2) DEFAULT 0,
    retained_earnings NUMERIC(20, 2) DEFAULT 0,
    total_assets NUMERIC(20, 2) DEFAULT 0,
    total_liabilities NUMERIC(20, 2) DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Initial Capital Structure Row
INSERT INTO capital_structure (owner_equity, retained_earnings, total_assets, total_liabilities)
VALUES (1000000, 0, 1000000, 0);
