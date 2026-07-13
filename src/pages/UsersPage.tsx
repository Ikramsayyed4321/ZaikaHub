import { FormEvent, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { createResource, deleteResource, listResource, updateResource } from '../services/adminApi';

interface UserRow {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'waiter' | 'cashier';
  is_active: boolean;
}

export function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'waiter' });

  const load = () => listResource<UserRow>('users').then(setUsers);
  useEffect(() => { load(); }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await createResource('users', form);
    setForm({ name: '', email: '', password: '', role: 'waiter' });
    await load();
  };

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="bg-white border border-primary/10 rounded-xl p-4 grid md:grid-cols-5 gap-2">
        <input placeholder="Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="border border-primary/20 rounded-lg p-2" />
        <input placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="border border-primary/20 rounded-lg p-2" />
        <input placeholder="Password" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="border border-primary/20 rounded-lg p-2" />
        <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} className="border border-primary/20 rounded-lg p-2">
          <option value="admin">Admin</option>
          <option value="waiter">Waiter</option>
          <option value="cashier">Cashier</option>
        </select>
        <button className="bg-primary text-white rounded-lg font-bold flex items-center justify-center gap-2"><Plus size={16} /> Add User</button>
      </form>
      <div className="bg-white border border-primary/10 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-primary/5 text-left">
            <tr><th className="p-3">Name</th><th>Email</th><th>Role</th><th>Status</th><th /></tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-primary/10">
                <td className="p-3 font-semibold">{user.name}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>
                  <button onClick={() => updateResource('users', user.id, { is_active: !user.is_active }).then(load)} className={`px-2 py-1 rounded-full text-xs font-bold ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="text-right p-3">
                  <button onClick={() => deleteResource('users', user.id).then(load)} className="text-red-500"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
