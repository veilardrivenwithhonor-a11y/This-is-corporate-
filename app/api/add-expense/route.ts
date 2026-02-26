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

    const { data, error } = await supabaseAdmin.rpc('add_expense', {
      p_amount: amount,
      p_expense_type: expense_type,
      p_category_id: category_id || null,
      p_note: note || null
    });

    if (error) throw error;

    return NextResponse.json({ success: true, expense_id: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
