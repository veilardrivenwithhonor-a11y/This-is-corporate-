import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { z } from 'zod';

const distributeSchema = z.object({
  amount: z.number().positive(),
  distributed_to: z.string(),
});

export async function POST(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const body = await req.json();
    const { amount, distributed_to } = distributeSchema.parse(body);

    const { data: cap } = await supabaseAdmin.from('capital_structure').select('*').limit(1).single();

    if (cap.retained_earnings < amount) {
      throw new Error(`Insufficient retained earnings for distribution. Available: ${cap.retained_earnings}`);
    }

    // Update global capital
    await supabaseAdmin.from('capital_structure').update({
      retained_earnings: cap.retained_earnings - amount,
      total_assets: cap.total_assets - amount,
    }).eq('id', cap.id);

    // Create distribution record
    const { data: dist, error: distError } = await supabaseAdmin
      .from('distributions')
      .insert({ amount, distributed_to })
      .select()
      .single();

    if (distError) throw distError;

    // Log ledger: Debit Retained Earnings, Credit Cash
    await supabaseAdmin.from('ledger').insert({
      reference_id: dist.id,
      reference_type: 'distribution',
      account_debited: 'retained_earnings',
      account_credited: 'cash',
      amount: amount,
    });

    return NextResponse.json({ success: true, distribution: dist });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
