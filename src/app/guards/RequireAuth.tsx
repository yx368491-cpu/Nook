import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useIsAuthenticated } from '@/lib/auth/guards';

interface RequireAuthProps {
  children: ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const isAuth = useIsAuthenticated();
  const location = useLocation();

  if (!isAuth) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
