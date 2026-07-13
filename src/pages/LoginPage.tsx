import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Lock, UtensilsCrossed } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@zaikahub.local');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-background flex items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-white border border-primary/10 rounded-xl shadow-xl p-6 space-y-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary text-accent rounded-full flex items-center justify-center mx-auto mb-3">
            <UtensilsCrossed size={30} />
          </div>
          <h1 className="font-display text-3xl font-bold text-primary">Zaika Hub</h1>
          <p className="text-sm text-primary/60">Secure Admin Login</p>
        </div>
        <label className="block text-sm font-semibold">
          Email
          <input value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full border border-primary/20 rounded-lg p-3 outline-none" />
        </label>
        <label className="block text-sm font-semibold">
          Password
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" className="mt-1 w-full border border-primary/20 rounded-lg p-3 outline-none" />
        </label>
        {error && <p className="text-sm text-red-600 font-semibold">{error}</p>}
        <button disabled={loading} className="w-full bg-primary text-white rounded-xl py-3 font-bold flex items-center justify-center gap-2">
          <Lock size={16} /> {loading ? 'Signing in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}
