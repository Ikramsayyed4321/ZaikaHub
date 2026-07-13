import { Clock } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { EmptyState } from '../components/EmptyState';
import { Header } from '../components/Header';
import { useApp } from '../context/AppContext';
import { updateOrderStatus } from '../services/api';
import type { Order, OrderStatus } from '../types';

function nextStatus(status: OrderStatus): OrderStatus {
  if (status === 'New') return 'Preparing';
  if (status === 'Preparing') return 'Ready';
  return 'Ready';
}

function statusClass(status: OrderStatus) {
  if (status === 'Ready') return 'border-green-500 bg-green-100 text-green-700';
  if (status === 'Preparing') return 'border-orange-500 bg-orange-100 text-orange-700';
  return 'border-red-500 bg-red-100 text-red-700';
}

export function KitchenPage() {
  const { state, dispatch } = useApp();
  const orders = state.orders.filter((order) => order.status !== 'Completed');

  const updateOrder = async (order: Order) => {
    if (order.status === 'Ready') return;
    const updated = await updateOrderStatus(order.id, nextStatus(order.status));
    dispatch({ type: 'UPDATE_ORDER_STATUS', payload: { id: updated.id, status: updated.status } });
  };

  return (
    <AppShell>
      <Header title="Kitchen View" />
      <div className="flex-1 overflow-y-auto scroll-contained p-4 bg-background">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-lg">Kitchen Orders</h2>
          <span className="bg-primary text-accent text-xs font-bold px-3 py-1 rounded-full">{orders.length} Active</span>
        </div>
        {orders.length === 0 ? (
          <EmptyState message="No pending orders. Waiting for the waiter to send orders..." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orders
              .sort((a, b) => ({ Ready: 1, Preparing: 2, New: 3, Completed: 4 }[a.status] - { Ready: 1, Preparing: 2, New: 3, Completed: 4 }[b.status]))
              .map((order) => (
                <div key={order.id} className={`border-l-4 p-4 rounded-r-xl shadow-sm bg-white ${statusClass(order.status)} animate-fade-in`}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="font-bold text-lg">Table {order.tableNo}</span>
                      <span className="text-xs ml-2 opacity-70">
                        <Clock size={12} className="inline mr-1" />
                        {order.time}
                      </span>
                    </div>
                    <button
                      onClick={() => updateOrder(order)}
                      disabled={order.status === 'Ready'}
                      className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm transition-transform active:scale-95 ${
                        order.status === 'Ready' ? 'opacity-50 cursor-not-allowed' : 'bg-white hover:bg-black/5'
                      }`}
                    >
                      {order.status === 'New' ? 'Start Preparing' : order.status === 'Preparing' ? 'Mark Ready' : 'Ready'}
                    </button>
                  </div>
                  <div className="space-y-1 mt-2 border-t border-black/10 pt-2">
                    {order.items.map((item, index) => (
                      <div key={`${order.id}-${index}`} className="flex justify-between text-sm">
                        <span className="font-medium">
                          {item.quantity} x {item.menuItem.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
