import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { z } from 'zod';

const sellSchema = z.object({
  items: z.array(z.object({
    inventory_id: z.string().uuid(),
    quantity: z.number().int().positive(),
  })),
});

export async function POST(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const body = await req.json();
    const { items } = sellSchema.parse(body);

    // Start a manual transaction simulation since Supabase JS doesn't support multi-table transactions easily without RPC
    // We'll use a series of checks and updates. In a real production app, this should be a Postgres Function (RPC).

    let totalRevenue = 0;
    let totalCost = 0;
    let totalProfit = 0;

    const saleItemsToInsert = [];
    const inventoryUpdates = [];
    const categoryUpdates: Record<string, { revenue: number; profit: number }> = {};

    for (const item of items) {
      const { data: inv, error: invError } = await supabaseAdmin
        .from('inventory')
        .select('*, categories(*)')
        .eq('id', item.inventory_id)
        .single();

      if (invError || !inv) throw new Error(`Inventory item ${item.inventory_id} not found`);
      if (inv.current_stock < item.quantity) throw new Error(`Insufficient stock for ${inv.name}`);

      const itemRevenue = inv.selling_price * item.quantity;
      const itemCost = inv.cost_price * item.quantity;
      const itemProfit = itemRevenue - itemCost;

      totalRevenue += itemRevenue;
      totalCost += itemCost;
      totalProfit += itemProfit;

      saleItemsToInsert.push({
        inventory_id: item.inventory_id,
        quantity: item.quantity,
        price: inv.selling_price,
        cost: inv.cost_price,
        profit: itemProfit,
      });

      inventoryUpdates.push({
        id: item.inventory_id,
        current_stock: inv.current_stock - item.quantity,
      });

      if (!categoryUpdates[inv.category_id]) {
        categoryUpdates[inv.category_id] = { revenue: 0, profit: 0 };
      }
      categoryUpdates[inv.category_id].revenue += itemRevenue;
      categoryUpdates[inv.category_id].profit += itemProfit;
    }

    // 1. Create Sale record
    const { data: sale, error: saleError } = await supabaseAdmin
      .from('sales')
      .insert({
        total_revenue: totalRevenue,
        total_cost: totalCost,
        gross_profit: totalProfit,
      })
      .select()
      .single();

    if (saleError) throw saleError;

    // 2. Create Sale Items
    const { error: itemsError } = await supabaseAdmin
      .from('sale_items')
      .insert(saleItemsToInsert.map(i => ({ ...i, sale_id: sale.id })));

    if (itemsError) throw itemsError;

    // 3. Update Inventory
    for (const invUpdate of inventoryUpdates) {
      await supabaseAdmin.from('inventory').update({ current_stock: invUpdate.current_stock }).eq('id', invUpdate.id);
    }

    // 4. Update Categories and Global Retained Earnings
    for (const [catId, updates] of Object.entries(categoryUpdates)) {
      const { data: cat } = await supabaseAdmin.from('categories').select('*').eq('id', catId).single();
      await supabaseAdmin.from('categories').update({
        revenue: (cat?.revenue || 0) + updates.revenue,
        retained_earnings: (cat?.retained_earnings || 0) + updates.profit
      }).eq('id', catId);
    }

    // 5. Update Global Capital Structure
    const { data: cap } = await supabaseAdmin.from('capital_structure').select('*').limit(1).single();
    await supabaseAdmin.from('capital_structure').update({
      retained_earnings: (cap?.retained_earnings || 0) + totalProfit,
      total_assets: (cap?.total_assets || 0) + totalProfit, // Assets increase by profit (Cash in - Cost out)
    }).eq('id', cap.id);

    // 6. Log Ledger
    await supabaseAdmin.from('ledger').insert({
      reference_id: sale.id,
      reference_type: 'sale',
      account_debited: 'cash',
      account_credited: 'revenue',
      amount: totalRevenue,
    });

    return NextResponse.json({ success: true, sale_id: sale.id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
