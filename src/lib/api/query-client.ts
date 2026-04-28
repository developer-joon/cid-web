import { QueryClient } from '@tanstack/react-query';

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          if (
            error &&
            typeof error === 'object' &&
            'code' in error &&
            typeof (error as { code: unknown }).code === 'string'
          ) {
            const code = (error as { code: string }).code;
            if (code === 'UNAUTHENTICATED' || code === 'SESSION_EXPIRED') return false;
          }
          return failureCount < 1;
        },
      },
      mutations: {
        retry: false,
      },
    },
  });
}
