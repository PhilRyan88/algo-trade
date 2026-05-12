import { apiSlice } from '../api/apiSlice';

export const dividendApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
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
  }),
});

export const { useGetDividendsQuery } = dividendApiSlice;
