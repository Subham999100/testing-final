// ============================================================
// Clyptus Job Portal - Shared Platform Frontend App
// ============================================================

import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppRoutes } from './routes';
import { useAuthStore } from './store/auth.store';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 60000,
    },
  },
});

const PlatformSessionBootstrap: React.FC = () => {
  const userId = useAuthStore((state) => state.user?.userId);
  useEffect(() => {
    queryClient.clear();
  }, [userId]);
  const restoreSession = useAuthStore((state) => state.restoreSession);
  const clearSession = useAuthStore((state) => state.clearSession);

  useEffect(() => {
    void restoreSession();

    const handleExpiredSession = () => clearSession();
    window.addEventListener('clyptus:platform-session-expired', handleExpiredSession);
    return () =>
      window.removeEventListener('clyptus:platform-session-expired', handleExpiredSession);
  }, [restoreSession, clearSession]);

  return <AppRoutes />;
};

export const App: React.FC = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <PlatformSessionBootstrap />
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
