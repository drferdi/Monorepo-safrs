import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CdssAppShell } from '@/components/cdss/AppShell';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
    mutations: { retry: 0 },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CdssAppShell />
    </QueryClientProvider>
  );
}

export default App;
