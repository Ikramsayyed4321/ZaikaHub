import { useEffect, useState } from 'react';

export function useSplash(duration = 2000) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timeout = window.setTimeout(() => setLoading(false), duration);
    return () => window.clearTimeout(timeout);
  }, [duration]);

  return loading;
}
