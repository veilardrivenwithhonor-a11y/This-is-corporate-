import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { z } from 'zod';

const addInventorySchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  cost_price: z.number().positive(),
  selling_price: z.number().positive(),
  minimum_stock: z.number().int().nonnegative().default(10),
  category_id: z.string().uuid(),
});

export async function POST(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const body = await req.json();
    const validatedData = addInventorySchema.parse(body);

    const { data, error } = await supabaseAdmin
      .from('inventory')
      .insert([validatedData])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('SKU already exists');
      }
      throw error;
    }

    return NextResponse.json({ success: true, item: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
