import { apiSlice } from '../api/apiSlice';

export const marketApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getHistoricalData: builder.query<any, string>({
      query: (symbol) => `/market/historical/${symbol}`,
      providesTags: ['Market'],
    }),
    getBreakouts: builder.query<any[], void>({
      query: () => '/breakout',
      providesTags: ['Breakout'],
    }),
    getOptions: builder.query<any[], void>({
      query: () => '/options',
      providesTags: ['Option'],
    }),
  }),
});

export const { useGetHistoricalDataQuery, useGetBreakoutsQuery, useGetOptionsQuery } = marketApiSlice;
