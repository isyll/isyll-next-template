import { defaultShouldDehydrateQuery, QueryClient } from '@tanstack/react-query'

const isServer = typeof window === 'undefined'

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // >0 so the client doesn't immediately refetch dehydrated SSR data.
        staleTime: 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
      dehydrate: {
        // Include 'pending' so streamed (non-awaited) prefetches hydrate.
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === 'pending',
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined

/** Fresh client per request on the server; module singleton in the browser. */
export function getQueryClient(): QueryClient {
  if (isServer) {
    return makeQueryClient()
  }
  browserQueryClient ??= makeQueryClient()
  return browserQueryClient
}
