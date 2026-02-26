import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { z } from 'zod';

const addInventorySchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  cost_price: z.number().nonnegative(),
  selling_price: z.number().nonnegative(),
  min_quantity: z.number().nonnegative().default(0),
  category_id: z.string().uuid(),
}).refine(data => data.selling_price >= data.cost_price, {
  message: "Selling price must be greater than or equal to cost price",
  path: ["selling_price"],
});

export async function POST(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const body = await req.json();
    const validatedData = addInventorySchema.parse(body);

    const { data, error } = await supabaseAdmin
      .from('inventory')
      .insert([{
        sku: validatedData.sku,
        name: validatedData.name,
        cost_price: validatedData.cost_price,
        selling_price: validatedData.selling_price,
        min_quantity: validatedData.min_quantity,
        category_id: validatedData.category_id,
        stock_quantity: 0 // Initial stock is always 0 on creation per rules
      }])
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
