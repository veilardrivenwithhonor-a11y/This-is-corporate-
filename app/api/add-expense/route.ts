import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { z } from 'zod';

const expenseSchema = z.object({
  amount: z.number().positive(),
  expense_type: z.enum(['operating', 'stock_purchase']),
  category_id: z.string().uuid().optional(),
  note: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const body = await req.json();
    const { amount, expense_type, category_id, note } = expenseSchema.parse(body);

    const { data: cap } = await supabaseAdmin.from('capital_structure').select('*').limit(1).single();

    if (expense_type === 'stock_purchase') {
      if (!category_id) throw new Error('Category ID required for stock purchase');
      
      const { data: cat } = await supabaseAdmin.from('categories').select('*').eq('id', category_id).single();
      if (!cat) throw new Error('Category not found');
      
      if (cat.allocated_capital < amount) {
        throw new Error(`Insufficient allocated capital in ${cat.name}. Available: ${cat.allocated_capital}`);
      }

      // Deduct from category capital
      await supabaseAdmin.from('categories').update({
        allocated_capital: cat.allocated_capital - amount
      }).eq('id', category_id);

      // Log ledger: Debit Inventory (Asset), Credit Category Capital
      await supabaseAdmin.from('ledger').insert({
        reference_id: category_id, // Simplified
        reference_type: 'stock_purchase',
        account_debited: 'inventory',
        account_credited: 'category_capital',
        amount: amount,
      });

    } else if (expense_type === 'operating') {
      if (cap.retained_earnings < amount) {
        throw new Error(`Insufficient global retained earnings. Available: ${cap.retained_earnings}`);
      }

      // Deduct from global retained earnings
      await supabaseAdmin.from('capital_structure').update({
        retained_earnings: cap.retained_earnings - amount,
        total_assets: cap.total_assets - amount,
      }).eq('id', cap.id);

      // Log ledger: Debit Expense, Credit Cash
      await supabaseAdmin.from('ledger').insert({
        reference_id: cap.id, // Simplified
        reference_type: 'operating_expense',
        account_debited: 'operating_expense',
        account_credited: 'cash',
        amount: amount,
      });
    }

    const { data: expense, error: expError } = await supabaseAdmin
      .from('expenses')
      .insert({ amount, expense_type, category_id, note })
      .select()
      .single();

    if (expError) throw expError;

    return NextResponse.json({ success: true, expense });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
