import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data: cap } = await supabaseAdmin.from('capital_structure').select('*').limit(1).single();
    const { data: categories } = await supabaseAdmin.from('categories').select('*');
    const { data: lowStock } = await supabaseAdmin.from('inventory').select('*, categories(name)').lt('current_stock', 10); // Simple threshold
    
    const { data: recentSales } = await supabaseAdmin
      .from('sales')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    const totalRevenue = categories?.reduce((acc, cat) => acc + Number(cat.revenue), 0) || 0;
    const totalAllocatedCapital = categories?.reduce((acc, cat) => acc + Number(cat.allocated_capital), 0) || 0;

    return NextResponse.json({
      capital: cap,
      categories,
      lowStock,
      recentSales,
      summary: {
        totalRevenue,
        totalAllocatedCapital,
        roi: totalRevenue > 0 ? ((cap.retained_earnings / totalAllocatedCapital) * 100).toFixed(2) : 0
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
