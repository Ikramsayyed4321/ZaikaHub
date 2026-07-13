import { BarChart3, FileText, LogOut, Receipt, Shield, Users, UtensilsCrossed } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { to: '/users', label: 'Users', icon: Users },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/billing-tools', label: 'Bills', icon: Receipt },
  { to: '/backup', label: 'Backup', icon: Shield },
  { to: '/role', label: 'POS', icon: UtensilsCrossed },
];

export function AdminShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="h-screen overflow-hidden bg-background text-primary md:flex">
      <aside className="md:w-64 bg-primary text-background p-4 md:h-screen overflow-y-auto scroll-contained">
        <div className="font-display text-2xl font-bold text-accent mb-6">Zaika Hub</div>
        <nav className="flex md:block gap-2 overflow-x-auto hide-scrollbar">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap ${
                  isActive ? 'bg-accent text-primary' : 'hover:bg-white/10'
                }`
              }
            >
              <Icon size={16} /> {label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={async () => {
            await logout();
            navigate('/login');
          }}
          className="mt-6 flex items-center gap-2 text-sm font-semibold text-background/80"
        >
          <LogOut size={16} /> Logout
        </button>
      </aside>
      <main className="flex-1 h-screen overflow-y-auto scroll-contained p-4 md:p-6">
        <div className="mb-4 flex justify-between items-center">
          <div>
            <h1 className="font-display text-2xl font-bold">Restaurant Admin Panel</h1>
            <p className="text-sm text-primary/60">
              {user?.name} • {user?.role}
            </p>
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
