import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useIsOwner } from '@/lib/auth/guards';

interface RequireAdminProps {
  children: ReactNode;
}

/**
 * Nook M6 · AdminGuard.
 *
 * Semantic alias of `RequireOwner`. In v1.0 the only Owner is THE admin, so
 * the two gates resolve to identical logic — `useIsOwner()` reads
 * `profile.role === 'owner'`, and the `profiles_one_owner_uidx` partial unique
 * index (migration 0003) ensures the system has at most one such user.
 *
 * This component is the route-side mirror of the server-side `profile.role`
 * gate inside `supabase/functions/admin-create-invite/index.ts`. The redirect
 * to `/` (not `/login`) is intentional: a Friend who somehow lands on
 * `/settings/admin` sees no value in being reminded to log in — they get
 * bounced home with no error noise.
 *
 * Future-proof: if/when Nook adds admin-only deactivation (e.g. another
 * admin kicking down a compromised admin), this hook can branch on
 * `profile.role === 'owner' && profile.isActive !== false` without touching
 * the routes file.
 */
export function RequireAdmin({ children }: RequireAdminProps) {
  const isOwner = useIsOwner();

  if (!isOwner) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
