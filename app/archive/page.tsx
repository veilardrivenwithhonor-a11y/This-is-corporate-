'use client';

import React, { useState, useEffect } from 'react';
import { getSupabase } from '@/lib/supabase';
import { Archive, RotateCcw, Search } from 'lucide-react';

export default function ArchivePage() {
  const [archives, setArchives] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [reversingId, setReversingId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const supabase = getSupabase();
    const { data: arch } = await supabase.from('sales_archive').select('*').order('archived_at', { ascending: false });
    const { data: sls } = await supabase.from('sales').select('*').eq('reversed', false).order('created_at', { ascending: false });
    if (arch) setArchives(arch);
    if (sls) setSales(sls);
  };

  const handleReverse = async (id: string) => {
    const reason = prompt('Reason for reversal?');
    if (!reason) return;
    
    setReversingId(id);
    try {
      const res = await fetch('/api/reverse-sale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sale_id: id, reason })
      });
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setReversingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Sales Archive & Reversals</h1>
        <p className="text-slate-500">Manage transaction reversals and view historical audit logs.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Active Sales (for reversal) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-50">
            <h3 className="text-lg font-bold">Active Transactions</h3>
            <p className="text-xs text-slate-400">Select a transaction to reverse.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold">Amount</th>
                  <th className="px-6 py-4 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sales.map(sale => (
                  <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm">{new Date(sale.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-sm font-bold">${sale.total_revenue.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => handleReverse(sale.id)}
                        disabled={reversingId === sale.id}
                        className="flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700 disabled:opacity-50"
                      >
                        <RotateCcw size={14} /> {reversingId === sale.id ? 'Reversing...' : 'Reverse'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Archive History */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-50">
            <h3 className="text-lg font-bold">Audit Archive</h3>
            <p className="text-xs text-slate-400">History of all reversed transactions.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">Archived At</th>
                  <th className="px-6 py-4 font-semibold">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {archives.map(arch => (
                  <tr key={arch.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm">{new Date(arch.archived_at).toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-slate-500 italic">&quot;{arch.reason}&quot;</td>
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
