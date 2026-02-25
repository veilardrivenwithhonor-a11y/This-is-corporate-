'use client';

import React, { useState, useEffect } from 'react';
import { getSupabase } from '@/lib/supabase';
import { InventoryItem, Category } from '@/lib/types';
import { Package, Plus, ArrowUpCircle, History } from 'lucide-react';

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const supabase = getSupabase();
    const { data: inv } = await supabase.from('inventory').select('*, categories(*)');
    const { data: cats } = await supabase.from('categories').select('*');
    if (inv) setInventory(inv);
    if (cats) setCategories(cats);
  };

  const handleRestock = async (id: string, qty: number) => {
    if (!confirm(`Confirm restock of ${qty} units?`)) return;
    setLoading(true);
    try {
      const res = await fetch('/api/restock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inventory_id: id, quantity: qty })
      });
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Management</h1>
          <p className="text-slate-500">Track stock levels and manage category capital.</p>
        </div>
      </header>

      {/* Category Capital Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {categories.map(cat => (
          <div key={cat.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-sm font-medium text-slate-500">{cat.name}</p>
            <h3 className="text-2xl font-bold mt-1">${cat.allocated_capital.toLocaleString()}</h3>
            <p className="text-[10px] text-slate-400 mt-2 uppercase tracking-wider font-bold">Allocated Capital</p>
          </div>
        ))}
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex justify-between items-center">
          <h3 className="text-lg font-bold">Stock Levels</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Item</th>
                <th className="px-6 py-4 font-semibold">Category</th>
                <th className="px-6 py-4 font-semibold">Cost/Sell</th>
                <th className="px-6 py-4 font-semibold">Stock</th>
                <th className="px-6 py-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {inventory.map(item => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-[10px] text-slate-400">{item.sku}</p>
                  </td>
                  <td className="px-6 py-4 text-sm">{item.category?.name}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className="text-slate-400">${item.cost_price}</span> / <span className="font-bold text-emerald-600">${item.selling_price}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${item.current_stock < item.minimum_stock ? 'text-amber-600' : 'text-slate-900'}`}>
                        {item.current_stock}
                      </span>
                      {item.current_stock < item.minimum_stock && (
                        <span className="px-1.5 py-0.5 bg-amber-100 text-amber-600 text-[8px] font-bold uppercase rounded">Low</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => handleRestock(item.id, 50)}
                      disabled={loading}
                      className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
                    >
                      <Plus size={14} /> Restock 50
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
