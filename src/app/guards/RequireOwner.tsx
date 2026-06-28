import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useIsOwner } from '@/lib/auth/guards';

interface RequireOwnerProps {
  children: ReactNode;
}

export function RequireOwner({ children }: RequireOwnerProps) {
  const isOwner = useIsOwner();

  if (!isOwner) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
