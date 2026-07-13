import { AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';

export function DatabaseStatus() {
  const { error } = useApp();

  if (!error) return null;

  return (
    <div className="fixed bottom-3 left-1/2 z-[60] w-[calc(100%-24px)] max-w-md -translate-x-1/2 rounded-lg border border-red-200 bg-red-100 px-3 py-2 text-xs font-semibold text-red-700 shadow-lg">
      <div className="flex items-start gap-2">
        <AlertCircle size={16} className="mt-0.5 shrink-0" />
        <span>Database connection issue. Changes may not be saved until the API/MySQL server is running.</span>
      </div>
    </div>
  );
}
