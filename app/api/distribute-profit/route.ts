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

    const { data, error } = await supabaseAdmin.rpc('distribute_profit', {
      p_amount: amount,
      p_distributed_to: distributed_to
    });

    if (error) throw error;

    return NextResponse.json({ success: true, distribution_id: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
