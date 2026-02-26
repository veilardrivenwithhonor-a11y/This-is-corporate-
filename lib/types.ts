export type Category = {
  id: string;
  name: string;
  allocated_capital: number;
  retained_earnings: number;
  revenue: number;
  created_at: string;
};

export type InventoryItem = {
  id: string;
  sku: string;
  name: string;
  cost_price: number;
  selling_price: number;
  stock_quantity: number;
  min_quantity: number;
  category_id: string;
  created_at: string;
  categories?: Category;
};

export type Sale = {
  id: string;
  total_revenue: number;
  total_cost: number;
  gross_profit: number;
  reversed: boolean;
  created_at: string;
  items?: SaleItem[];
};

export type SaleItem = {
  id: string;
  sale_id: string;
  inventory_id: string;
  quantity: number;
  price: number;
  cost: number;
  profit: number;
  created_at: string;
  inventory?: InventoryItem;
};

export type Expense = {
  id: string;
  amount: number;
  expense_type: 'operating' | 'stock_purchase';
  category_id?: string;
  note: string;
  created_at: string;
};

export type Distribution = {
  id: string;
  amount: number;
  distributed_to: string;
  created_at: string;
};

export type LedgerEntry = {
  id: string;
  reference_id: string;
  reference_type: string;
  account_debited: string;
  account_credited: string;
  amount: number;
  created_at: string;
};

export type CapitalStructure = {
  id: string;
  owner_equity: number;
  retained_earnings: number;
  total_assets: number;
  total_liabilities: number;
  updated_at: string;
};
