'use client';

import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  PieChart as PieChartIcon
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { motion } from 'motion/react';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard-report')
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="flex items-center justify-center h-full">Loading Dashboard...</div>;
  if (!data || !data.capital) return <div className="flex items-center justify-center h-full text-red-500">Error loading financial data. Please ensure database is initialized.</div>;

  const stats = [
    { name: 'Total Assets', value: `$${(data.capital.total_assets || 0).toLocaleString()}`, icon: DollarSign, color: 'text-emerald-500' },
    { name: 'Retained Earnings', value: `$${(data.capital.retained_earnings || 0).toLocaleString()}`, icon: TrendingUp, color: 'text-blue-500' },
    { name: 'Total Revenue', value: `$${(data.summary?.totalRevenue || 0).toLocaleString()}`, icon: ArrowUpRight, color: 'text-amber-500' },
    { name: 'Category ROI', value: `${data.summary?.roi || 0}%`, icon: PieChartIcon, color: 'text-purple-500' },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Financial Overview</h1>
        <p className="text-slate-500">Real-time corporate performance metrics.</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2 rounded-lg bg-slate-50 ${stat.color}`}>
                <stat.icon size={20} />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-500">{stat.name}</p>
            <h3 className="text-2xl font-bold mt-1">{stat.value}</h3>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Revenue by Category */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold mb-6">Revenue by Category</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.categories}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Capital Allocation */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold mb-6">Capital Allocation</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.categories}
                  dataKey="allocated_capital"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                >
                  {data.categories.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Low Stock Alerts */}
      {data.lowStock.length > 0 && (
        <div className="bg-amber-50 border border-amber-100 p-6 rounded-2xl">
          <div className="flex items-center gap-2 text-amber-800 mb-4">
            <AlertCircle size={20} />
            <h3 className="font-bold">Inventory Alerts</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.lowStock.map((item: any) => (
              <div key={item.id} className="bg-white p-4 rounded-xl border border-amber-200 flex justify-between items-center">
                <div>
                  <p className="font-medium text-slate-900">{item.name}</p>
                  <p className="text-xs text-slate-500">{item.categories.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-amber-600">{item.stock_quantity} units</p>
                  <p className="text-[10px] text-slate-400">Min: {item.min_quantity}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Sales Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-50">
          <h3 className="text-lg font-bold">Recent Transactions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold">Revenue</th>
                <th className="px-6 py-4 font-semibold">Cost</th>
                <th className="px-6 py-4 font-semibold">Profit</th>
                <th className="px-6 py-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.recentSales.map((sale: any) => (
                <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm">{new Date(sale.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-sm font-medium">${sale.total_revenue.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">${sale.total_cost.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm font-bold text-emerald-600">${sale.gross_profit.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${sale.reversed ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                      {sale.reversed ? 'Reversed' : 'Completed'}
                    </span>
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
