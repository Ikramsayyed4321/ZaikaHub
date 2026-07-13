import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { adminRequest } from '../services/adminApi';

interface DashboardData {
  sales: { total_sales: number };
  orders: { total_orders: number; pending_orders: number; completed_orders: number };
  tables: { occupied_tables: number; available_tables: number };
  revenueByCategory: Array<{ name: string; value: number }>;
  topItems: Array<{ name: string; quantity: number; sales: number }>;
  line: Array<{ date: string; sales: number }>;
}

const colors = ['#4a0e0e', '#d4af37', '#16a34a', '#dc2626', '#ea580c'];

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    adminRequest<DashboardData>('/reports/dashboard').then(setData).catch(() => setData(null));
  }, []);

  if (!data) return <div className="p-10 text-center font-semibold text-primary/50">Loading dashboard...</div>;

  const kpis = [
    ['Total Sales Today', `₹${Number(data.sales.total_sales || 0).toFixed(2)}`],
    ['Total Orders', data.orders.total_orders || 0],
    ['Pending Orders', data.orders.pending_orders || 0],
    ['Completed Orders', data.orders.completed_orders || 0],
    ['Occupied Tables', data.tables.occupied_tables || 0],
    ['Available Tables', data.tables.available_tables || 0],
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {kpis.map(([label, value]) => (
          <div key={label} className="bg-white border border-primary/10 rounded-xl p-4 shadow-sm">
            <p className="text-xs uppercase font-bold text-primary/50">{label}</p>
            <p className="font-display text-2xl font-bold mt-1">{value}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-primary/10 rounded-xl p-4 h-80">
          <h2 className="font-bold mb-3">Sales Trend</h2>
          <ResponsiveContainer width="100%" height="90%">
            <LineChart data={data.line}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="sales" stroke="#4a0e0e" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white border border-primary/10 rounded-xl p-4 h-80">
          <h2 className="font-bold mb-3">Top Selling Items</h2>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={data.topItems}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" hide />
              <YAxis />
              <Tooltip />
              <Bar dataKey="quantity" fill="#d4af37" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white border border-primary/10 rounded-xl p-4 h-80 lg:col-span-2">
          <h2 className="font-bold mb-3">Revenue by Category</h2>
          <ResponsiveContainer width="100%" height="90%">
            <PieChart>
              <Pie data={data.revenueByCategory} dataKey="value" nameKey="name" outerRadius={100} label>
                {data.revenueByCategory.map((_, index) => <Cell key={index} fill={colors[index % colors.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
