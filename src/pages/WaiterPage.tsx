import { CheckCircle, Minus, Plus, Send } from 'lucide-react';
import { useState } from 'react';
import { AppShell } from '../components/AppShell';
import { Header } from '../components/Header';
import { useApp } from '../context/AppContext';
import { createOrder } from '../services/api';
import { calculateSelectionTotal } from '../services/orderService';
import type { MenuCategory, MenuItem } from '../types';

const categories: MenuCategory[] = ['Thali', 'Veg', 'Non-Veg', 'Desserts', 'Cold Drinks'];

function VegIndicator({ item }: { item: MenuItem }) {
  return (
    <div className={`w-3 h-3 rounded-sm border ${item.isVeg ? 'border-green-600' : 'border-red-600'} flex items-center justify-center`}>
      <div className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
    </div>
  );
}

export function WaiterPage() {
  const { state, dispatch } = useApp();
  const [tableNo, setTableNo] = useState(1);
  const [activeCategory, setActiveCategory] = useState<MenuCategory>('Thali');
  const [selectedItems, setSelectedItems] = useState<Record<number, number>>({});
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const categoryItems = state.menuItems.filter((item) => item.category === activeCategory);
  const total = calculateSelectionTotal(state.menuItems, selectedItems);
  const totalItems = Object.values(selectedItems).reduce((sum, quantity) => sum + quantity, 0);

  const addItem = (item: MenuItem) => {
    if (!item.available) return;
    setSelectedItems((current) => ({ ...current, [item.id]: (current[item.id] || 0) + 1 }));
  };

  const removeItem = (item: MenuItem) => {
    setSelectedItems((current) => {
      const next = { ...current };
      if (next[item.id] > 1) next[item.id] -= 1;
      else delete next[item.id];
      return next;
    });
  };

  const sendOrder = async () => {
    if (!Object.keys(selectedItems).length) return;
    setSending(true);
    try {
      const order = await createOrder({
        tableNo,
        items: Object.entries(selectedItems).map(([menuItemId, quantity]) => ({ menuItemId: Number(menuItemId), quantity })),
      });
      dispatch({ type: 'ADD_ORDER', payload: order });
      setSelectedItems({});
      setSent(true);
      window.setTimeout(() => setSent(false), 3000);
    } finally {
      setSending(false);
    }
  };

  return (
    <AppShell>
      <Header title="Waiter View" />
      <div className="flex flex-col h-[calc(100vh-72px)] bg-background">
        {sent && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-full shadow-lg z-50 animate-fade-in flex items-center gap-2">
            <CheckCircle size={16} /> Order sent to kitchen!
          </div>
        )}
        <div className="p-4 bg-white shadow-sm flex items-center justify-between">
          <span className="font-semibold text-primary">Select Table:</span>
          <select
            value={tableNo}
            onChange={(event) => setTableNo(Number(event.target.value))}
            className="bg-background border border-primary/20 rounded p-2 text-primary font-bold outline-none"
          >
            {Array.from({ length: 20 }, (_, index) => index + 1).map((table) => (
              <option key={table} value={table}>
                Table {table}
              </option>
            ))}
          </select>
        </div>
        <div className="flex overflow-x-auto p-2 gap-2 hide-scrollbar bg-primary/5">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                activeCategory === category ? 'bg-primary text-white shadow-md' : 'bg-white text-primary/70 border border-primary/10'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto scroll-contained p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pb-32 items-start content-start">
          {categoryItems.map((item) => (
            <div
              key={item.id}
              className={`bg-white p-3 rounded-xl shadow-sm border border-primary/10 flex justify-between items-center ${
                !item.available ? 'opacity-50 grayscale' : ''
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <VegIndicator item={item} />
                  <h3 className="font-bold text-primary truncate">{item.name}</h3>
                </div>
                <p className="text-accent font-semibold mt-1">₹{item.price}</p>
              </div>
              <div className="flex items-center gap-3">
                {selectedItems[item.id] ? (
                  <div className="flex items-center bg-primary/10 rounded-lg overflow-hidden border border-primary/20">
                    <button onClick={() => removeItem(item)} className="p-2 text-primary hover:bg-primary/20" aria-label="Remove item">
                      <Minus size={16} />
                    </button>
                    <span className="w-8 text-center font-bold">{selectedItems[item.id]}</span>
                    <button onClick={() => addItem(item)} className="p-2 text-primary hover:bg-primary/20" aria-label="Add item">
                      <Plus size={16} />
                    </button>
                  </div>
                ) : (
                  <button
                    disabled={!item.available}
                    onClick={() => addItem(item)}
                    className={`px-4 py-2 rounded-lg font-semibold text-sm ${
                      item.available ? 'bg-primary/10 text-primary hover:bg-primary/20' : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {item.available ? 'Add' : 'Out'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        {Object.keys(selectedItems).length > 0 && (
          <div className="absolute bottom-0 w-full max-w-md md:max-w-3xl lg:max-w-5xl bg-white border-t border-primary/10 p-4 shadow-[0_-4px_15px_rgba(0,0,0,0.05)] animate-fade-in rounded-t-2xl z-20">
            <div className="flex justify-between items-center mb-3">
              <div>
                <p className="text-xs text-primary/60 font-semibold uppercase tracking-wider">Total Amount</p>
                <p className="text-2xl font-display font-bold text-primary">₹{total}</p>
              </div>
              <p className="text-sm font-semibold text-primary/80">{totalItems} items</p>
            </div>
            <button
              onClick={sendOrder}
              disabled={sending}
              className="w-full bg-primary text-white py-3 rounded-xl font-bold flex justify-center items-center gap-2 shadow-lg hover:bg-primary/90 transition-colors"
            >
              <Send size={18} /> {sending ? 'Sending...' : 'Send to Kitchen'}
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
