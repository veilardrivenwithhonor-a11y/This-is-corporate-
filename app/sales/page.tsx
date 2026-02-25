'use client';

import React, { useState, useEffect } from 'react';
import { getSupabase } from '@/lib/supabase';
import { InventoryItem } from '@/lib/types';
import { ShoppingCart, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function SalesPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [cart, setCart] = useState<{ item: InventoryItem; quantity: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabase();
    supabase.from('inventory').select('*, categories(*)').then(({ data }) => {
      if (data) setInventory(data);
    });
  }, []);

  const addToCart = (item: InventoryItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.item.id === item.id);
      if (existing) {
        return prev.map(i => i.item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.item.id !== id));
  };

  const totalRevenue = cart.reduce((acc, i) => acc + i.item.selling_price * i.quantity, 0);
  const totalCost = cart.reduce((acc, i) => acc + i.item.cost_price * i.quantity, 0);
  const totalProfit = totalRevenue - totalCost;

  const handleSubmit = async () => {
    if (cart.length === 0) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/sell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map(i => ({ inventory_id: i.item.id, quantity: i.quantity }))
        })
      });

      const result = await res.json();
      if (result.error) throw new Error(result.error);

      setSuccess(`Sale #${result.sale_id.slice(0, 8)} recorded successfully!`);
      setCart([]);
      // Refresh inventory
      const supabase = getSupabase();
      const { data } = await supabase.from('inventory').select('*, categories(*)');
      if (data) setInventory(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Point of Sale</h1>
        <p className="text-slate-500">Process retail transactions and update inventory.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Inventory List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {inventory.map(item => (
              <div key={item.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex justify-between items-center">
                <div>
                  <p className="font-bold text-slate-900">{item.name}</p>
                  <p className="text-xs text-slate-500">{item.sku} • {item.category?.name}</p>
                  <p className="text-sm font-bold text-emerald-600 mt-2">${item.selling_price}</p>
                  <p className="text-[10px] text-slate-400">Stock: {item.current_stock}</p>
                </div>
                <button 
                  onClick={() => addToCart(item)}
                  disabled={item.current_stock === 0}
                  className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:bg-slate-200 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus size={20} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Cart */}
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100 h-fit sticky top-8">
          <div className="flex items-center gap-2 mb-6">
            <ShoppingCart size={20} className="text-emerald-500" />
            <h3 className="text-lg font-bold">Transaction Summary</h3>
          </div>

          <div className="space-y-4 mb-8">
            {cart.length === 0 && <p className="text-slate-400 text-center py-8">Cart is empty</p>}
            {cart.map(i => (
              <div key={i.item.id} className="flex justify-between items-center text-sm">
                <div className="flex-1">
                  <p className="font-medium">{i.item.name}</p>
                  <p className="text-xs text-slate-500">{i.quantity} x ${i.item.selling_price}</p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="font-bold">${(i.quantity * i.item.selling_price).toFixed(2)}</p>
                  <button onClick={() => removeFromCart(i.item.id)} className="text-slate-300 hover:text-red-500">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {cart.length > 0 && (
            <div className="space-y-2 pt-4 border-t border-slate-100">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-medium">${totalRevenue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Cost of Goods</span>
                <span className="font-medium text-slate-400">-${totalCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-slate-50">
                <span>Gross Profit</span>
                <span className="text-emerald-600">${totalProfit.toFixed(2)}</span>
              </div>

              <button 
                onClick={handleSubmit}
                disabled={loading}
                className="w-full mt-6 bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Complete Sale'}
              </button>
            </div>
          )}

          <AnimatePresence>
            {success && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 p-3 bg-emerald-50 text-emerald-700 rounded-lg text-xs flex items-center gap-2"
              >
                <CheckCircle2 size={14} />
                {success}
              </motion.div>
            )}
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-xs"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
