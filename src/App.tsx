import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useAuth } from '@/stores/useAuth';
import { authApi } from '@/lib/api/auth';
import AppRoutes from '@/app/routes';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const initialize = useAuth((s) => s.initialize);
  const isInitialized = useAuth((s) => s.isInitialized);

  useEffect(() => {
    initialize();

    // Listen for auth state changes (login/logout from other tabs)
    const unsubscribe = authApi.onAuthChange((event, userId) => {
      if (event === 'SIGNED_IN' && userId) {
        // Reinitialize to pick up the new session
        initialize();
      } else if (event === 'SIGNED_OUT') {
        useAuth.getState().clear();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [initialize]);

  if (!isInitialized) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: 'var(--color-canvas-default)',
          color: 'var(--color-ink-muted)',
        }}
      >
        <span role="status">Loading…</span>
      </div>
    );
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthInitializer>
          <AppRoutes />
        </AuthInitializer>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
