import { LogOut, UtensilsCrossed } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export function Header({ title }: { title: string }) {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();

  const logout = () => {
    dispatch({ type: 'SET_ROLE', payload: null });
    navigate('/role');
  };

  return (
    <header className="bg-primary text-background p-4 flex justify-between items-center shadow-md z-10 sticky top-0">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center text-primary font-bold overflow-hidden">
          <UtensilsCrossed size={20} />
        </div>
        <div>
          <h1 className="font-display font-bold text-lg leading-tight">{state.settings.restaurantName}</h1>
          <p className="text-xs opacity-80">{title}</p>
        </div>
      </div>
      {state.activeRole && (
        <button onClick={logout} className="p-2 hover:bg-white/10 rounded-full transition-colors" aria-label="Log out">
          <LogOut size={20} />
        </button>
      )}
    </header>
  );
}
