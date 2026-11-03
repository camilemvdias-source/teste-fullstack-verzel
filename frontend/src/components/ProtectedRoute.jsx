import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/useAuth.js';

// Uso: <ProtectedRoute role="bidder"><Pagina /></ProtectedRoute>
// Sem "role", basta estar logado.
export default function ProtectedRoute({ role, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="page"><div className="skeleton" style={{ height: 320 }} /></div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (role && user.role !== role) return <Navigate to="/" replace />;

  return children;
}
