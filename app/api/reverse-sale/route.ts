import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { z } from 'zod';

const reverseSchema = z.object({
  sale_id: z.string().uuid(),
  reason: z.string(),
});

export async function POST(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const body = await req.json();
    const { sale_id, reason } = reverseSchema.parse(body);

    // 1. Get sale details
    const { data: sale, error: saleError } = await supabaseAdmin
      .from('sales')
      .select('*, sale_items(*)')
      .eq('id', sale_id)
      .single();

    if (saleError || !sale) throw new Error('Sale not found');
    if (sale.reversed) throw new Error('Sale already reversed');

    // 2. Reverse inventory and category stats
    for (const item of sale.sale_items) {
      const { data: inv } = await supabaseAdmin.from('inventory').select('*').eq('id', item.inventory_id).single();
      await supabaseAdmin.from('inventory').update({
        current_stock: (inv?.current_stock || 0) + item.quantity
      }).eq('id', item.inventory_id);

      const { data: cat } = await supabaseAdmin.from('categories').select('*').eq('id', inv?.category_id).single();
      await supabaseAdmin.from('categories').update({
        revenue: (cat?.revenue || 0) - item.price * item.quantity,
        retained_earnings: (cat?.retained_earnings || 0) - item.profit
      }).eq('id', inv?.category_id);
    }

    // 3. Update global capital
    const { data: cap } = await supabaseAdmin.from('capital_structure').select('*').limit(1).single();
    await supabaseAdmin.from('capital_structure').update({
      retained_earnings: cap.retained_earnings - sale.gross_profit,
      total_assets: cap.total_assets - sale.gross_profit,
    }).eq('id', cap.id);

    // 4. Mark sale as reversed
    await supabaseAdmin.from('sales').update({ reversed: true }).eq('id', sale_id);

    // 5. Archive
    await supabaseAdmin.from('sales_archive').insert({
      original_sale_id: sale_id,
      reason: reason
    });

    // 6. Log ledger (reversal)
    await supabaseAdmin.from('ledger').insert({
      reference_id: sale_id,
      reference_type: 'sale_reversal',
      account_debited: 'revenue',
      account_credited: 'cash',
      amount: sale.total_revenue,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
