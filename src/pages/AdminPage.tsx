import { CheckCircle, CreditCard, History, Menu as MenuIcon, Plus, Trash2, TrendingUp, Users, UtensilsCrossed, X, XCircle } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { AppShell } from '../components/AppShell';
import { EmptyState } from '../components/EmptyState';
import { Header } from '../components/Header';
import { useApp } from '../context/AppContext';
import { cancelOrder, createMenuItem, createPayment, deleteMenuItem, updateMenuItem } from '../services/api';
import type { AdminTab, MenuCategory } from '../types';

const tabs: Array<{ id: AdminTab; label: string; icon: React.ElementType }> = [
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'orders', label: 'Orders', icon: UtensilsCrossed },
  { id: 'history', label: 'History', icon: History },
  { id: 'menu', label: 'Menu', icon: MenuIcon },
  { id: 'staff', label: 'Staff', icon: Users },
];

export function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('billing');

  return (
    <AppShell>
      <Header title="Admin View" />
      <div className="flex flex-col h-[calc(100vh-72px)] bg-background">
        <div className="flex bg-white shadow-sm sticky top-0 z-10 border-b border-primary/10">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 py-3 flex flex-col items-center gap-1 transition-colors ${
                activeTab === id ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-primary/50'
              }`}
            >
              <Icon size={20} />
              <span className="text-xs font-semibold">{label}</span>
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto scroll-contained p-4 pb-20">
          {activeTab === 'billing' && <BillingTab />}
          {activeTab === 'orders' && <OrdersTab />}
          {activeTab === 'history' && <HistoryTab />}
          {activeTab === 'menu' && <MenuTab />}
          {activeTab === 'staff' && <StaffTab />}
        </div>
      </div>
    </AppShell>
  );
}

function BillingTab() {
  const { state, dispatch } = useApp();
  const [selectedTable, setSelectedTable] = useState<number | ''>('');
  const [billVisible, setBillVisible] = useState(false);
  const activeTables = [...new Set(state.orders.map((order) => order.tableNo))].sort((a, b) => a - b);
  const tableOrders = selectedTable ? state.orders.filter((order) => order.tableNo === selectedTable && order.status !== 'Completed') : [];
  const subtotal = tableOrders.reduce((sum, order) => sum + order.total, 0);
  const tax = subtotal * (state.settings.taxRate / 100);
  const grandTotal = subtotal + tax;

  if (!activeTables.length) return <EmptyState message="No active tables." />;

  const markPaid = async () => {
    if (!selectedTable) return;
    await createPayment({ tableNo: selectedTable, amount: grandTotal, paymentMethod: 'cash' });
    dispatch({
      type: 'ARCHIVE_TABLE_ORDERS',
      payload: { tableNo: selectedTable, timestamp: new Date().toISOString(), grandTotal },
    });
    setSelectedTable('');
    setBillVisible(false);
    window.alert('Table cleared and marked as paid!');
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-primary/10">
        <label className="block text-sm font-semibold text-primary mb-2">Select Table to Bill</label>
        <select
          value={selectedTable}
          onChange={(event) => {
            setSelectedTable(Number(event.target.value));
            setBillVisible(false);
          }}
          className="w-full bg-background border border-primary/20 rounded-lg p-3 text-primary font-bold outline-none"
        >
          <option value="" disabled>
            Select Table
          </option>
          {activeTables.map((table) => (
            <option key={table} value={table}>
              Table {table}
            </option>
          ))}
        </select>
      </div>
      {selectedTable && !billVisible && (
        <button onClick={() => setBillVisible(true)} className="w-full bg-accent text-primary py-3 rounded-xl font-bold shadow-md hover:bg-accent/90">
          Generate Bill
        </button>
      )}
      {billVisible && (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-primary/20 relative animate-fade-in print-section md:max-w-lg md:mx-auto">
          <div className="text-center mb-6 border-b border-dashed border-primary/30 pb-4">
            <div className="w-12 h-12 bg-accent rounded-full mx-auto flex items-center justify-center text-primary mb-2">
              <UtensilsCrossed size={24} />
            </div>
            <h2 className="font-display font-bold text-2xl tracking-wide">{state.settings.restaurantName}</h2>
            <p className="text-xs text-primary/70">123 Food Street, Food City</p>
            <p className="text-xs text-primary/70 mt-1">Ph: +91 98765 43210</p>
            <div className="flex justify-between mt-4 text-xs font-semibold">
              <span>Date: {new Date().toLocaleDateString()}</span>
              <span>Table: {selectedTable}</span>
            </div>
          </div>
          <table className="w-full text-sm mb-4">
            <thead>
              <tr className="border-b border-primary/20 text-left">
                <th className="pb-2 font-semibold">Item</th>
                <th className="pb-2 font-semibold text-center">Qty</th>
                <th className="pb-2 font-semibold text-right">Amt</th>
              </tr>
            </thead>
            <tbody>
              {tableOrders.flatMap((order) =>
                order.items.map((item, index) => (
                  <tr key={`${order.id}-${index}`} className="border-b border-primary/5">
                    <td className="py-2 text-primary/80">{item.menuItem.name}</td>
                    <td className="py-2 text-center text-primary/80">{item.quantity}</td>
                    <td className="py-2 text-right text-primary/80">₹{item.menuItem.price * item.quantity}</td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
          <div className="border-t border-primary/20 pt-2 space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs text-primary/60">
              <span>CGST (2.5%)</span>
              <span>₹{(tax / 2).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs text-primary/60">
              <span>SGST (2.5%)</span>
              <span>₹{(tax / 2).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t border-primary/20">
              <span>Grand Total</span>
              <span>₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>
          <p className="text-center text-xs mt-6 text-primary/60 italic font-display">Thank you for dining with us!</p>
          <button onClick={markPaid} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold mt-6 shadow-md hover:bg-green-700">
            Mark Paid & Clear Table
          </button>
        </div>
      )}
    </div>
  );
}

function OrdersTab() {
  const { state, dispatch } = useApp();
  return (
    <div className="animate-fade-in">
      <h3 className="font-bold text-lg mb-4">All Active Orders</h3>
      {!state.orders.length && <p className="text-primary/50 text-center p-4">No orders today.</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {state.orders.map((order) => (
          <div key={order.id} className="bg-white p-4 rounded-xl shadow-sm border border-primary/10 flex justify-between items-center">
            <div>
              <p className="font-bold">
                Table {order.tableNo} <span className="text-xs font-normal bg-primary/10 px-2 py-0.5 rounded ml-2">{order.status}</span>
              </p>
              <p className="text-xs text-primary/60 mt-1">
                {order.items.length} items • ₹{order.total}
              </p>
            </div>
            <button
              onClick={async () => {
                await cancelOrder(order.id);
                dispatch({ type: 'CANCEL_ORDER', payload: { id: order.id } });
              }}
              className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
              aria-label="Cancel order"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function MenuTab() {
  const { state, dispatch } = useApp();
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<{ name: string; price: string; category: MenuCategory; isVeg: boolean }>({
    name: '',
    price: '',
    category: 'Veg',
    isVeg: true,
  });

  const saveItem = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.name || !form.price) return;
    const item = await createMenuItem({ ...form, price: Number(form.price), available: true });
    dispatch({ type: 'ADD_MENU_ITEM', payload: item });
    setFormOpen(false);
    setForm({ name: '', price: '', category: 'Veg', isVeg: true });
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-lg">Menu Management</h3>
        <button onClick={() => setFormOpen((open) => !open)} className="bg-primary text-white p-2 rounded-lg shadow" aria-label="Toggle item form">
          {formOpen ? <X size={18} /> : <Plus size={18} />}
        </button>
      </div>
      {formOpen && (
        <form onSubmit={saveItem} className="bg-white p-4 rounded-xl shadow-sm border border-primary/20 space-y-3">
          <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} type="text" placeholder="Item Name" required className="w-full p-2 border border-primary/20 rounded outline-none" />
          <div className="flex gap-2">
            <input value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} type="number" placeholder="Price" required className="flex-1 p-2 border border-primary/20 rounded outline-none min-w-0" />
            <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as MenuCategory })} className="flex-1 p-2 border border-primary/20 rounded outline-none bg-white min-w-0">
              {(['Thali', 'Veg', 'Non-Veg', 'Desserts', 'Cold Drinks'] as MenuCategory[]).map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input id="isVeg" type="checkbox" checked={form.isVeg} onChange={(event) => setForm({ ...form, isVeg: event.target.checked })} />
            <label htmlFor="isVeg" className="text-sm font-semibold">
              Vegetarian
            </label>
          </div>
          <button type="submit" className="w-full bg-accent text-primary font-bold py-2 rounded">
            Save Item
          </button>
        </form>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {state.menuItems.map((item) => (
          <div key={item.id} className="bg-white p-3 rounded-lg shadow-sm border border-primary/10 flex justify-between items-center">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{item.name}</p>
              <p className="text-xs text-primary/60">
                {item.category} • ₹{item.price}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={async () => {
                  await updateMenuItem(item.id, { available: !item.available });
                  dispatch({ type: 'TOGGLE_MENU_ITEM', payload: { id: item.id } });
                }}
                aria-label="Toggle menu item"
              >
                {item.available ? <CheckCircle size={24} className="text-green-600" /> : <XCircle size={24} className="text-gray-400" />}
              </button>
              <button
                onClick={async () => {
                  await deleteMenuItem(item.id);
                  dispatch({ type: 'DELETE_MENU_ITEM', payload: { id: item.id } });
                }}
                className="text-red-400 hover:text-red-600"
                aria-label="Delete menu item"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StaffTab() {
  const { state, dispatch } = useApp();
  const presentCount = state.staff.filter((member) => member.present).length;
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-white p-4 rounded-xl shadow-sm flex justify-between items-center border border-primary/10">
        <div>
          <h3 className="font-bold text-lg">Staff Attendance</h3>
          <p className="text-xs text-primary/60">
            {presentCount} Present / {state.staff.length} Total
          </p>
        </div>
        <Users size={24} className="text-accent" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {state.staff.map((member) => (
          <div key={member.id} className="bg-white p-3 rounded-xl shadow-sm border border-primary/10 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary shrink-0">
                <Users size={16} className="opacity-50" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-sm truncate">{member.name}</p>
                <p className="text-xs text-primary/60 truncate">
                  {member.role} • {member.phone}
                </p>
              </div>
            </div>
            <button
              onClick={() => dispatch({ type: 'TOGGLE_STAFF_ATTENDANCE', payload: { id: member.id } })}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-colors shrink-0 ${
                member.present ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'
              }`}
            >
              {member.present ? 'Present' : 'Absent'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function HistoryTab() {
  const { state } = useApp();
  const [period, setPeriod] = useState<'day' | 'month' | 'year' | 'all'>('day');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const filteredHistory = useMemo(
    () =>
      (state.orderHistory || []).filter((entry) => {
        if (period === 'all') return true;
        const entryDate = new Date(entry.timestamp);
        if (period === 'day') return entryDate.toISOString().split('T')[0] === date;
        if (period === 'month') return entryDate.toISOString().substring(0, 7) === date.substring(0, 7);
        return entryDate.toISOString().substring(0, 4) === date.substring(0, 4);
      }),
    [date, period, state.orderHistory],
  );
  const totalRevenue = filteredHistory.reduce((sum, entry) => sum + entry.grandTotal, 0);
  const totalOrders = filteredHistory.reduce((sum, entry) => sum + entry.orders.length, 0);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-primary/10">
        <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
          <TrendingUp size={20} /> Sales History & Analytics
        </h3>
        <div className="flex gap-2 mb-3">
          <select value={period} onChange={(event) => setPeriod(event.target.value as typeof period)} className="p-2 border border-primary/20 rounded-lg outline-none bg-background text-primary font-semibold">
            <option value="day">Daily</option>
            <option value="month">Monthly</option>
            <option value="year">Yearly</option>
            <option value="all">All Time</option>
          </select>
          {period === 'day' && <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="p-2 border border-primary/20 rounded-lg flex-1 outline-none font-semibold text-primary min-w-0" />}
          {period === 'month' && <input type="month" value={date.substring(0, 7)} onChange={(event) => setDate(`${event.target.value}-01`)} className="p-2 border border-primary/20 rounded-lg flex-1 outline-none font-semibold text-primary min-w-0" />}
          {period === 'year' && <input type="number" value={date.substring(0, 4)} onChange={(event) => setDate(`${event.target.value}-01-01`)} className="p-2 border border-primary/20 rounded-lg flex-1 outline-none font-semibold text-primary min-w-0" />}
        </div>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-primary/5 p-3 rounded-lg border border-primary/10 text-center">
            <p className="text-xs text-primary/60 font-semibold uppercase">Total Revenue</p>
            <p className="font-display font-bold text-xl text-primary">₹{totalRevenue.toFixed(2)}</p>
          </div>
          <div className="bg-primary/5 p-3 rounded-lg border border-primary/10 text-center">
            <p className="text-xs text-primary/60 font-semibold uppercase">Total Orders</p>
            <p className="font-display font-bold text-xl text-primary">{totalOrders}</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredHistory.length === 0 ? (
          <p className="text-center text-primary/50 py-10 font-semibold col-span-full">No sales data for this period.</p>
        ) : (
          filteredHistory.map((entry) => (
            <div key={entry.id} className="bg-white p-4 rounded-xl shadow-sm border border-primary/10">
              <div className="flex justify-between items-center mb-2 pb-2 border-b border-primary/10">
                <div>
                  <span className="font-bold text-lg">Table {entry.tableNo}</span>
                  <span className="block text-xs text-primary/60">{new Date(entry.timestamp).toLocaleString()}</span>
                </div>
                <span className="font-bold text-accent bg-primary px-3 py-1 rounded-full text-sm">₹{entry.grandTotal.toFixed(2)}</span>
              </div>
              <div className="space-y-1 mt-2">
                {entry.orders.flatMap((order) =>
                  order.items.map((item, index) => (
                    <div key={`${order.id}-${index}`} className="flex justify-between text-sm text-primary/80">
                      <span>
                        {item.quantity} x {item.menuItem.name}
                      </span>
                      <span>₹{item.menuItem.price * item.quantity}</span>
                    </div>
                  )),
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
