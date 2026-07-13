import { useState } from 'react';
import { adminRequest } from '../services/adminApi';

export function BillingToolsPage() {
  const [orderId, setOrderId] = useState('');
  const [message, setMessage] = useState('');
  const api = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

  const generate = async () => {
    const invoice = await adminRequest<{ invoiceNumber: string }>(`/invoices/orders/${orderId}`, {
      method: 'POST',
      body: JSON.stringify({ payment_method: 'cash' }),
    });
    setMessage(`Invoice generated: ${invoice.invoiceNumber}`);
  };

  return (
    <div className="bg-white border border-primary/10 rounded-xl p-6 space-y-3 max-w-lg">
      <h2 className="font-display text-2xl font-bold">PDF Bill Tools</h2>
      <input value={orderId} onChange={(event) => setOrderId(event.target.value)} placeholder="Order ID" className="w-full border border-primary/20 rounded-lg p-3" />
      <div className="flex gap-2">
        <button onClick={generate} className="bg-primary text-white rounded-lg px-4 py-2 font-bold">Generate Invoice</button>
        {orderId && <a href={`${api}/invoices/orders/${orderId}/pdf`} className="bg-accent text-primary rounded-lg px-4 py-2 font-bold">Download PDF</a>}
      </div>
      {message && <p className="font-semibold text-green-700">{message}</p>}
    </div>
  );
}
