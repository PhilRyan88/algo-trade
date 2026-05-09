import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: import.meta.env.VITE_API_URL }),
  tagTypes: ['Breakout', 'Dividend', 'Option'],
  endpoints: (builder) => ({
    getBreakouts: builder.query<any[], void>({
      query: () => '/breakout',
      providesTags: ['Breakout'],
    }),
    getDividends: builder.query<{ data: any[], hasMore: boolean, total: number }, number>({
      query: (page = 1) => `/dividends?page=${page}&limit=10`,
      providesTags: ['Dividend'],
      merge: (currentCache, newResponse, { arg: page }) => {
        if (page === 1) return newResponse;
        
        const existingIds = new Set(currentCache.data.map(item => item.id));
        const uniqueNewItems = newResponse.data.filter(item => !existingIds.has(item.id));
        
        return {
          ...newResponse,
          data: [...currentCache.data, ...uniqueNewItems],
        };
      },
      serializeQueryArgs: ({ endpointName }) => {
        return endpointName;
      },
      forceRefetch({ currentArg, previousArg }) {
        return currentArg !== previousArg;
      },
    }),
    getOptions: builder.query<any[], void>({
      query: () => '/options',
      providesTags: ['Option'],
    }),
  }),
});

export const {
  useGetBreakoutsQuery,
  useGetDividendsQuery,
  useGetOptionsQuery,
} = apiSlice;
