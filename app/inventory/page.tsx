'use client';

import React, { useState, useEffect } from 'react';
import { getSupabase } from '@/lib/supabase';
import { InventoryItem, Category } from '@/lib/types';
import { Package, Plus, ArrowUpCircle, History, X, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  
  const [newItem, setNewItem] = useState({
    sku: '',
    name: '',
    cost_price: '',
    selling_price: '',
    minimum_stock: '10',
    category_id: ''
  });

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

  const handleAddInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/add-inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newItem,
          cost_price: parseFloat(newItem.cost_price),
          selling_price: parseFloat(newItem.selling_price),
          minimum_stock: parseInt(newItem.minimum_stock)
        })
      });
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      
      setShowAddForm(false);
      setNewItem({
        sku: '',
        name: '',
        cost_price: '',
        selling_price: '',
        minimum_stock: '10',
        category_id: ''
      });
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
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-emerald-600 transition-colors"
        >
          {showAddForm ? <X size={20} /> : <Plus size={20} />}
          {showAddForm ? 'Cancel' : 'Add New Item'}
        </button>
      </header>

      <AnimatePresence>
        {showAddForm && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="text-lg font-bold mb-6">Create New Inventory Item</h3>
              <form onSubmit={handleAddInventory} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">SKU</label>
                  <input 
                    type="text" 
                    required
                    value={newItem.sku}
                    onChange={e => setNewItem({...newItem, sku: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g. SKU-1001"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Item Name</label>
                  <input 
                    type="text" 
                    required
                    value={newItem.name}
                    onChange={e => setNewItem({...newItem, name: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g. Premium Widget"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Category</label>
                  <select 
                    required
                    value={newItem.category_id}
                    onChange={e => setNewItem({...newItem, category_id: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cost Price</label>
                  <input 
                    type="number" 
                    step="0.01"
                    required
                    value={newItem.cost_price}
                    onChange={e => setNewItem({...newItem, cost_price: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Selling Price</label>
                  <input 
                    type="number" 
                    step="0.01"
                    required
                    value={newItem.selling_price}
                    onChange={e => setNewItem({...newItem, selling_price: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Min Stock Level</label>
                  <input 
                    type="number" 
                    required
                    value={newItem.minimum_stock}
                    onChange={e => setNewItem({...newItem, minimum_stock: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="10"
                  />
                </div>
                <div className="md:col-span-2 lg:col-span-3 flex justify-end">
                  <button 
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors disabled:opacity-50"
                  >
                    <Save size={20} />
                    {loading ? 'Saving...' : 'Save Item'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                  <td className="px-6 py-4 text-sm">{item.categories?.name}</td>
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
