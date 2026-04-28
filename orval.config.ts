import { defineConfig } from 'orval';

export default defineConfig({
  cid: {
    input: {
      target: 'http://localhost:8080/v3/api-docs',
    },
    output: {
      mode: 'tags-split',
      target: 'src/api/generated/endpoints',
      schemas: 'src/api/generated/schemas',
      client: 'react-query',
      httpClient: 'fetch',
      baseUrl: '/api/proxy',
      override: {
        mutator: {
          path: 'src/lib/api/mutator.ts',
          name: 'apiFetch',
        },
        query: {
          useQuery: true,
          useMutation: true,
          signal: false,
        },
      },
    },
    hooks: {
      afterAllFilesWrite: 'prettier --write',
    },
  },
});
