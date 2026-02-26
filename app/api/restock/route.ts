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

    const { error } = await supabaseAdmin.rpc('restock', {
      p_inventory_id: inventory_id,
      p_quantity: quantity
    });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
