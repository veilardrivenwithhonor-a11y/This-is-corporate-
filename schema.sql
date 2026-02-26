-- SQL Schema for Retail Finance Pro (Updated)
-- Run this in your Supabase SQL Editor

-- 1. Categories
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    allocated_capital NUMERIC(20, 2) DEFAULT 0,
    retained_earnings NUMERIC(20, 2) DEFAULT 0,
    revenue NUMERIC(20, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert Default Categories
INSERT INTO categories (name) 
VALUES ('Oil'), ('Spare Parts'), ('Electrical Spare Parts')
ON CONFLICT (name) DO NOTHING;

-- 2. Inventory
CREATE TABLE IF NOT EXISTS inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category_id UUID REFERENCES categories(id),
    cost_price NUMERIC(20, 2) NOT NULL,
    selling_price NUMERIC(20, 2) NOT NULL,
    stock_quantity NUMERIC DEFAULT 0,
    min_quantity NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Migration block if table already existed with different names
DO $$ 
BEGIN 
    -- Rename current_stock to stock_quantity if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory' AND column_name='current_stock') THEN
        ALTER TABLE inventory RENAME COLUMN current_stock TO stock_quantity;
        ALTER TABLE inventory ALTER COLUMN stock_quantity TYPE NUMERIC;
    END IF;

    -- Rename minimum_stock to min_quantity if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory' AND column_name='minimum_stock') THEN
        ALTER TABLE inventory RENAME COLUMN minimum_stock TO min_quantity;
        ALTER TABLE inventory ALTER COLUMN min_quantity TYPE NUMERIC;
    END IF;

    -- Ensure category_id exists (it already does in my previous version, but let's be safe)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory' AND column_name='category_id') THEN
        ALTER TABLE inventory ADD COLUMN category_id UUID REFERENCES categories(id);
    END IF;
END $$;

-- 3. Sales
CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    total_revenue NUMERIC(20, 2) NOT NULL,
    total_cost NUMERIC(20, 2) NOT NULL,
    gross_profit NUMERIC(20, 2) NOT NULL,
    reversed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Sale Items
CREATE TABLE IF NOT EXISTS sale_items (
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
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amount NUMERIC(20, 2) NOT NULL,
    expense_type TEXT CHECK (expense_type IN ('operating', 'stock_purchase')),
    category_id UUID REFERENCES categories(id),
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Distributions
CREATE TABLE IF NOT EXISTS distributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amount NUMERIC(20, 2) NOT NULL,
    distributed_to TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Sales Archive
CREATE TABLE IF NOT EXISTS sales_archive (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_sale_id UUID,
    archived_at TIMESTAMPTZ DEFAULT now(),
    reason TEXT
);

-- 8. Ledger (Double-Entry)
CREATE TABLE IF NOT EXISTS ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_id UUID NOT NULL,
    reference_type TEXT NOT NULL,
    account_debited TEXT NOT NULL,
    account_credited TEXT NOT NULL,
    amount NUMERIC(20, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Capital Structure
CREATE TABLE IF NOT EXISTS capital_structure (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_equity NUMERIC(20, 2) DEFAULT 0,
    retained_earnings NUMERIC(20, 2) DEFAULT 0,
    total_assets NUMERIC(20, 2) DEFAULT 0,
    total_liabilities NUMERIC(20, 2) DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Initial Capital Structure Row
INSERT INTO capital_structure (owner_equity, retained_earnings, total_assets, total_liabilities)
VALUES (1000000, 0, 1000000, 0)
ON CONFLICT DO NOTHING;

-- FINANCIAL FUNCTIONS (RPC) - Updated for new column names

-- 1. Process Sale
CREATE OR REPLACE FUNCTION process_sale(items JSONB)
RETURNS UUID AS $$
DECLARE
    v_sale_id UUID;
    v_total_revenue NUMERIC := 0;
    v_total_cost NUMERIC := 0;
    v_total_profit NUMERIC := 0;
    v_item RECORD;
    v_inv RECORD;
BEGIN
    -- Create Sale record
    INSERT INTO sales (total_revenue, total_cost, gross_profit)
    VALUES (0, 0, 0)
    RETURNING id INTO v_sale_id;

    FOR v_item IN SELECT * FROM jsonb_to_recordset(items) AS x(inventory_id UUID, quantity INT)
    LOOP
        SELECT * INTO v_inv FROM inventory WHERE id = v_item.inventory_id FOR UPDATE;
        
        IF NOT FOUND THEN RAISE EXCEPTION 'Inventory item % not found', v_item.inventory_id; END IF;
        IF v_inv.stock_quantity < v_item.quantity THEN RAISE EXCEPTION 'Insufficient stock for %', v_inv.name; END IF;

        INSERT INTO sale_items (sale_id, inventory_id, quantity, price, cost, profit)
        VALUES (
            v_sale_id, 
            v_item.inventory_id, 
            v_item.quantity, 
            v_inv.selling_price, 
            v_inv.cost_price, 
            (v_inv.selling_price - v_inv.cost_price) * v_item.quantity
        );

        v_total_revenue := v_total_revenue + (v_inv.selling_price * v_item.quantity);
        v_total_cost := v_total_cost + (v_inv.cost_price * v_item.quantity);
        
        -- Update Inventory
        UPDATE inventory SET stock_quantity = stock_quantity - v_item.quantity WHERE id = v_item.inventory_id;
        
        -- Update Category Stats
        UPDATE categories SET 
            revenue = revenue + (v_inv.selling_price * v_item.quantity),
            retained_earnings = retained_earnings + ((v_inv.selling_price - v_inv.cost_price) * v_item.quantity)
        WHERE id = v_inv.category_id;
    END LOOP;

    v_total_profit := v_total_revenue - v_total_cost;

    -- Update Sale totals
    UPDATE sales SET 
        total_revenue = v_total_revenue,
        total_cost = v_total_cost,
        gross_profit = v_total_profit
    WHERE id = v_sale_id;

    -- Update Global Capital
    UPDATE capital_structure SET 
        retained_earnings = retained_earnings + v_total_profit,
        total_assets = total_assets + v_total_profit;

    -- Ledger Entry
    INSERT INTO ledger (reference_id, reference_type, account_debited, account_credited, amount)
    VALUES (v_sale_id, 'sale', 'cash', 'revenue', v_total_revenue);

    RETURN v_sale_id;
END;
$$ LANGUAGE plpgsql;

-- 2. Add Expense
CREATE OR REPLACE FUNCTION add_expense(
    p_amount NUMERIC, 
    p_expense_type TEXT, 
    p_category_id UUID DEFAULT NULL, 
    p_note TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_expense_id UUID;
BEGIN
    IF p_expense_type = 'stock_purchase' THEN
        IF p_category_id IS NULL THEN RAISE EXCEPTION 'Category ID required for stock purchase'; END IF;
        
        IF (SELECT allocated_capital FROM categories WHERE id = p_category_id) < p_amount THEN
            RAISE EXCEPTION 'Insufficient allocated capital in category';
        END IF;

        UPDATE categories SET allocated_capital = allocated_capital - p_amount WHERE id = p_category_id;
        
        INSERT INTO ledger (reference_id, reference_type, account_debited, account_credited, amount)
        VALUES (p_category_id, 'stock_purchase', 'inventory', 'category_capital', p_amount);
        
    ELSIF p_expense_type = 'operating' THEN
        IF (SELECT retained_earnings FROM capital_structure LIMIT 1) < p_amount THEN
            RAISE EXCEPTION 'Insufficient global retained earnings';
        END IF;

        UPDATE capital_structure SET 
            retained_earnings = retained_earnings - p_amount,
            total_assets = total_assets - p_amount;

        INSERT INTO ledger (reference_id, reference_type, account_debited, account_credited, amount)
        VALUES (gen_random_uuid(), 'operating_expense', 'operating_expense', 'cash', p_amount);
    END IF;

    INSERT INTO expenses (amount, expense_type, category_id, note)
    VALUES (p_amount, p_expense_type, p_category_id, p_note)
    RETURNING id INTO v_expense_id;

    RETURN v_expense_id;
END;
$$ LANGUAGE plpgsql;

-- 3. Distribute Profit
CREATE OR REPLACE FUNCTION distribute_profit(p_amount NUMERIC, p_distributed_to TEXT)
RETURNS UUID AS $$
DECLARE
    v_dist_id UUID;
BEGIN
    IF (SELECT retained_earnings FROM capital_structure LIMIT 1) < p_amount THEN
        RAISE EXCEPTION 'Insufficient retained earnings for distribution';
    END IF;

    UPDATE capital_structure SET 
        retained_earnings = retained_earnings - p_amount,
        total_assets = total_assets - p_amount;

    INSERT INTO distributions (amount, distributed_to)
    VALUES (p_amount, p_distributed_to)
    RETURNING id INTO v_dist_id;

    INSERT INTO ledger (reference_id, reference_type, account_debited, account_credited, amount)
    VALUES (v_dist_id, 'distribution', 'retained_earnings', 'cash', p_amount);

    RETURN v_dist_id;
END;
$$ LANGUAGE plpgsql;

-- 4. Restock
CREATE OR REPLACE FUNCTION restock(p_inventory_id UUID, p_quantity INT)
RETURNS VOID AS $$
DECLARE
    v_inv RECORD;
    v_total_cost NUMERIC;
BEGIN
    SELECT * INTO v_inv FROM inventory WHERE id = p_inventory_id FOR UPDATE;
    v_total_cost := v_inv.cost_price * p_quantity;

    IF (SELECT allocated_capital FROM categories WHERE id = v_inv.category_id) < v_total_cost THEN
        RAISE EXCEPTION 'Insufficient category capital for restock';
    END IF;

    UPDATE categories SET allocated_capital = allocated_capital - v_total_cost WHERE id = v_inv.category_id;
    UPDATE inventory SET stock_quantity = stock_quantity + p_quantity WHERE id = p_inventory_id;

    INSERT INTO expenses (amount, expense_type, category_id, note)
    VALUES (v_total_cost, 'stock_purchase', v_inv.category_id, 'Restock ' || p_quantity || ' units of ' || v_inv.name);

    INSERT INTO ledger (reference_id, reference_type, account_debited, account_credited, amount)
    VALUES (p_inventory_id, 'restock', 'inventory', 'category_capital', v_total_cost);
END;
$$ LANGUAGE plpgsql;

-- 5. Reverse Sale
CREATE OR REPLACE FUNCTION reverse_sale(p_sale_id UUID, p_reason TEXT)
RETURNS VOID AS $$
DECLARE
    v_sale RECORD;
    v_item RECORD;
BEGIN
    SELECT * INTO v_sale FROM sales WHERE id = p_sale_id FOR UPDATE;
    IF v_sale.reversed THEN RAISE EXCEPTION 'Sale already reversed'; END IF;

    FOR v_item IN SELECT * FROM sale_items WHERE sale_id = p_sale_id
    LOOP
        UPDATE inventory SET stock_quantity = stock_quantity + v_item.quantity WHERE id = v_item.inventory_id;
        
        UPDATE categories SET 
            revenue = revenue - (v_item.price * v_item.quantity),
            retained_earnings = retained_earnings - v_item.profit
        WHERE id = (SELECT category_id FROM inventory WHERE id = v_item.inventory_id);
    END LOOP;

    UPDATE capital_structure SET 
        retained_earnings = retained_earnings - v_sale.gross_profit,
        total_assets = total_assets - v_sale.gross_profit;

    UPDATE sales SET reversed = true WHERE id = p_sale_id;

    INSERT INTO sales_archive (original_sale_id, reason)
    VALUES (p_sale_id, p_reason);

    INSERT INTO ledger (reference_id, reference_type, account_debited, account_credited, amount)
    VALUES (p_sale_id, 'sale_reversal', 'revenue', 'cash', v_sale.total_revenue);
END;
$$ LANGUAGE plpgsql;
