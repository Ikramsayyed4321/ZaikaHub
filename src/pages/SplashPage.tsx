import { Navigate } from 'react-router-dom';
import { LoadingScreen } from '../components/LoadingScreen';
import { useSplash } from '../hooks/useSplash';

export function SplashPage() {
  const loading = useSplash();
  return loading ? <LoadingScreen /> : <Navigate to="/role" replace />;
}
