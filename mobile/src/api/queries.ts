import { useQuery } from '@tanstack/react-query';

const API_BASE_URL = 'http://localhost:3000/api'; // Replace with env variable in prod

export const useBreakoutStocks = () => {
  return useQuery({
    queryKey: ['breakout-stocks'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/breakout`);
      if (!response.ok) throw new Error('Network response was not ok');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useDividendStocks = () => {
  return useQuery({
    queryKey: ['dividend-stocks'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/dividends`);
      if (!response.ok) throw new Error('Network response was not ok');
      return response.json();
    },
    staleTime: 10 * 60 * 1000,
  });
};

export const useOptionsSignals = () => {
  return useQuery({
    queryKey: ['options-signals'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/options`);
      if (!response.ok) throw new Error('Network response was not ok');
      return response.json();
    },
    staleTime: 60 * 1000, // Frequent updates for options
  });
};
