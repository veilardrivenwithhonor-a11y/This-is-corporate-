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

    const { error } = await supabaseAdmin.rpc('reverse_sale', {
      p_sale_id: sale_id,
      p_reason: reason
    });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
