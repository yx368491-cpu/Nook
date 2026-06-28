import { useAuth } from '@/stores/useAuth';

export function useIsAuthenticated(): boolean {
  return useAuth((s) => s.session !== null);
}

export function useIsOwner(): boolean {
  return useAuth((s) => s.profile?.role === 'owner');
}
