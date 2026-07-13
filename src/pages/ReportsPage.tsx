import { useEffect, useState } from 'react';
import { adminRequest } from '../services/adminApi';

export function ReportsPage() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [from, setFrom] = useState(new Date().toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const base = `${import.meta.env.VITE_API_URL || '/api'}/reports/sales?from=${from}&to=${to}`;

  useEffect(() => {
    adminRequest<Record<string, unknown>[]>(`/reports/sales?from=${from}&to=${to}`).then(setRows);
  }, [from, to]);

  return (
    <div className="space-y-4">
      <div className="bg-white border border-primary/10 rounded-xl p-4 flex flex-wrap gap-2 items-end">
        <label className="text-sm font-semibold">From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="block border border-primary/20 rounded p-2" /></label>
        <label className="text-sm font-semibold">To<input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="block border border-primary/20 rounded p-2" /></label>
        <a href={`${base}&format=csv`} className="bg-primary text-white rounded-lg px-4 py-2 font-bold">Export CSV</a>
      </div>
      <div className="bg-white border border-primary/10 rounded-xl p-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr><th className="text-left p-2">Date</th><th>Method</th><th>Payments</th><th>Amount</th></tr></thead>
          <tbody>{rows.map((row, index) => <tr key={index} className="border-t"><td className="p-2">{String(row.date || '')}</td><td>{String(row.payment_method || '')}</td><td>{String(row.payments || 0)}</td><td>₹{String(row.amount || 0)}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
