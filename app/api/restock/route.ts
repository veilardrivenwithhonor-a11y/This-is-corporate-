import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { z } from 'zod';

const restockSchema = z.object({
  inventory_id: z.string().uuid(),
  quantity: z.number().int().positive(),
});

export async function POST(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const body = await req.json();
    const { inventory_id, quantity } = restockSchema.parse(body);

    const { data: inv, error: invError } = await supabaseAdmin
      .from('inventory')
      .select('*, categories(*)')
      .eq('id', inventory_id)
      .single();

    if (invError || !inv) throw new Error('Inventory item not found');

    const totalCost = inv.cost_price * quantity;

    // Check category capital
    if (inv.categories.allocated_capital < totalCost) {
      throw new Error(`Insufficient category capital. Need ${totalCost}, have ${inv.categories.allocated_capital}`);
    }

    // 1. Deduct from category capital
    await supabaseAdmin.from('categories').update({
      allocated_capital: inv.categories.allocated_capital - totalCost
    }).eq('id', inv.category_id);

    // 2. Increase inventory stock
    await supabaseAdmin.from('inventory').update({
      current_stock: inv.current_stock + quantity
    }).eq('id', inventory_id);

    // 3. Log expense
    await supabaseAdmin.from('expenses').insert({
      amount: totalCost,
      expense_type: 'stock_purchase',
      category_id: inv.category_id,
      note: `Restock ${quantity} units of ${inv.name}`
    });

    // 4. Log ledger
    await supabaseAdmin.from('ledger').insert({
      reference_id: inventory_id,
      reference_type: 'restock',
      account_debited: 'inventory',
      account_credited: 'category_capital',
      amount: totalCost,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
