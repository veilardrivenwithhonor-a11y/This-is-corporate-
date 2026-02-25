'use client';

import React, { useState, useEffect } from 'react';
import { getSupabase } from '@/lib/supabase';
import { Distribution, CapitalStructure } from '@/lib/types';
import { TrendingUp, Plus, User, DollarSign } from 'lucide-react';
import { motion } from 'motion/react';

export default function DistributionsPage() {
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [capital, setCapital] = useState<CapitalStructure | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    amount: '',
    distributed_to: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const supabase = getSupabase();
    const { data: dist } = await supabase.from('distributions').select('*').order('created_at', { ascending: false });
    const { data: cap } = await supabase.from('capital_structure').select('*').limit(1).single();
    if (dist) setDistributions(dist);
    if (cap) setCapital(cap);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/distribute-profit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(formData.amount),
          distributed_to: formData.distributed_to
        })
      });
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      setFormData({ amount: '', distributed_to: '' });
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
        <h1 className="text-3xl font-bold tracking-tight">Profit Distribution</h1>
        <p className="text-slate-500">Distribute retained earnings to stakeholders.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-fit">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <TrendingUp size={20} className="text-emerald-500" />
            New Distribution
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                <input 
                  type="number" 
                  required
                  value={formData.amount}
                  onChange={e => setFormData({...formData, amount: e.target.value})}
                  className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Distributed To</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><User size={14} /></span>
                <input 
                  type="text" 
                  required
                  value={formData.distributed_to}
                  onChange={e => setFormData({...formData, distributed_to: e.target.value})}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Stakeholder Name"
                />
              </div>
            </div>
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Confirm Distribution'}
            </button>
          </form>

          {capital && (
            <div className="mt-6 p-4 bg-emerald-50 rounded-xl border border-emerald-100 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-emerald-700">Available for Distribution</span>
                <span className="font-bold text-emerald-800">${capital.retained_earnings.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>

        {/* List */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-50">
            <h3 className="text-lg font-bold">Distribution History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold">Stakeholder</th>
                  <th className="px-6 py-4 font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {distributions.map(dist => (
                  <tr key={dist.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm">{new Date(dist.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-sm font-medium">{dist.distributed_to}</td>
                    <td className="px-6 py-4 text-sm font-bold text-emerald-600">${dist.amount.toLocaleString()}</td>
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
