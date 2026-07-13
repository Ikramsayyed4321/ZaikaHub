import { ChefHat, ChevronRight, Shield, UtensilsCrossed, WalletCards } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { RoleLayout } from '../layouts/RoleLayout';
import { useApp } from '../context/AppContext';
import type { Role } from '../types';

const roles: Array<{ role: Role; label: string; path: string; icon: React.ElementType }> = [
  { role: 'Waiter', label: 'Waiter', path: '/waiter', icon: WalletCards },
  { role: 'Kitchen', label: 'Kitchen', path: '/kitchen', icon: ChefHat },
  { role: 'Admin', label: 'Admin / Cashier', path: '/admin', icon: Shield },
];

export function RoleSelectPage() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();

  const selectRole = (role: Role, path: string) => {
    dispatch({ type: 'SET_ROLE', payload: role });
    navigate(path);
  };

  return (
    <RoleLayout>
      <div className="mb-10 text-center">
        <div className="w-20 h-20 bg-primary rounded-full mx-auto flex items-center justify-center text-accent mb-4 shadow-lg">
          <UtensilsCrossed size={36} />
        </div>
        <h1 className="font-display font-bold text-3xl text-primary">{state.settings.restaurantName}</h1>
        <p className="text-primary/60 text-sm mt-1">Select your role to continue</p>
      </div>
      <div className="w-full max-w-sm mx-auto space-y-4">
        {roles.map(({ role, label, path, icon: Icon }) => (
          <button
            key={role}
            onClick={() => selectRole(role, path)}
            className="w-full bg-white border border-primary/20 p-4 rounded-xl flex items-center justify-between shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 p-3 rounded-lg text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                <Icon size={24} />
              </div>
              <span className="font-bold text-lg text-primary">{label}</span>
            </div>
            <ChevronRight size={20} className="text-primary/30" />
          </button>
        ))}
      </div>
      <p className="absolute bottom-6 text-xs text-primary/40 font-semibold">POS System v1.0 • Built with React</p>
    </RoleLayout>
  );
}
