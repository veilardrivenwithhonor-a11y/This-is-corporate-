'use client';

import React, { useState, useEffect } from 'react';
import { getSupabase } from '@/lib/supabase';
import { Expense, Category, CapitalStructure } from '@/lib/types';
import { Receipt, Plus, AlertCircle } from 'lucide-react';

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [capital, setCapital] = useState<CapitalStructure | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    amount: '',
    expense_type: 'operating',
    category_id: '',
    note: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const supabase = getSupabase();
    const { data: exp } = await supabase.from('expenses').select('*, categories(name)').order('created_at', { ascending: false });
    const { data: cats } = await supabase.from('categories').select('*');
    const { data: cap } = await supabase.from('capital_structure').select('*').limit(1).single();
    if (exp) setExpenses(exp);
    if (cats) setCategories(cats);
    if (cap) setCapital(cap);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/add-expense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(formData.amount),
          expense_type: formData.expense_type,
          category_id: formData.category_id || undefined,
          note: formData.note
        })
      });
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      setFormData({ amount: '', expense_type: 'operating', category_id: '', note: '' });
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Expense Management</h1>
        <p className="text-slate-500">Record operating costs and stock purchases.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-fit">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <Plus size={20} className="text-emerald-500" />
            New Expense
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Amount</label>
              <input 
                type="number" 
                required
                value={formData.amount}
                onChange={e => setFormData({...formData, amount: e.target.value})}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Type</label>
              <select 
                value={formData.expense_type}
                onChange={e => setFormData({...formData, expense_type: e.target.value})}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="operating">Operating (Global Profit)</option>
                <option value="stock_purchase">Stock Purchase (Category Capital)</option>
              </select>
            </div>
            {formData.expense_type === 'stock_purchase' && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Category</label>
                <select 
                  required
                  value={formData.category_id}
                  onChange={e => setFormData({...formData, category_id: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name} (${cat.allocated_capital})</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Note</label>
              <textarea 
                value={formData.note}
                onChange={e => setFormData({...formData, note: e.target.value})}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 h-24"
                placeholder="Description..."
              />
            </div>
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {loading ? 'Recording...' : 'Record Expense'}
            </button>
          </form>

          {capital && (
            <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Available Profit Pool</span>
                <span className="font-bold text-emerald-600">${capital.retained_earnings.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>

        {/* List */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-50">
            <h3 className="text-lg font-bold">Expense History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold">Type</th>
                  <th className="px-6 py-4 font-semibold">Amount</th>
                  <th className="px-6 py-4 font-semibold">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {expenses.map(exp => (
                  <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm">{new Date(exp.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${exp.expense_type === 'operating' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                        {exp.expense_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-red-600">-${exp.amount.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{exp.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
