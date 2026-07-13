import { useState } from 'react';
import { adminRequest } from '../services/adminApi';

export function BackupPage() {
  const [message, setMessage] = useState('');

  const createBackup = async () => {
    const backup = await adminRequest<{ id: number; fileName: string }>('/backups', { method: 'POST' });
    setMessage(`Backup created: ${backup.fileName}`);
  };

  return (
    <div className="bg-white border border-primary/10 rounded-xl p-6 space-y-3">
      <h2 className="font-display text-2xl font-bold">Database Backup</h2>
      <p className="text-sm text-primary/60">Admin-only SQL backup generated locally on the server.</p>
      <button onClick={createBackup} className="bg-primary text-white rounded-lg px-4 py-2 font-bold">Create Backup</button>
      {message && <p className="font-semibold text-green-700">{message}</p>}
    </div>
  );
}
