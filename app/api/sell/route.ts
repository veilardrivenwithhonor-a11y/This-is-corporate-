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

    // Call the transactional RPC function
    const { data, error } = await supabaseAdmin.rpc('process_sale', {
      items: items // items is already an array, JSONB handles it
    });

    if (error) throw error;

    return NextResponse.json({ success: true, sale_id: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
