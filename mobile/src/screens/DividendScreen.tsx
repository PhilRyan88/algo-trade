import React from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useDividendStocks } from '../api/queries';

export default function DividendScreen() {
  const { data, isLoading, error } = useDividendStocks();

  if (isLoading) return <ActivityIndicator style={styles.center} size="large" color="#007AFF" />;
  if (error) return <Text style={styles.error}>Error fetching dividends</Text>;

  const mockData = data || [
    { id: '1', symbol: 'KO', price: 60.50, buyDate: '2026-05-01', sellDate: '2026-06-01', dividendPerShare: 0.46, yield: 3.1 },
    { id: '2', symbol: 'T', price: 15.20, buyDate: '2026-04-20', sellDate: '2026-05-10', dividendPerShare: 0.28, yield: 7.2 }
  ];

  return (
    <View style={styles.container}>
      <FlatList
        data={mockData}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.headerRow}>
              <Text style={styles.symbol}>{item.symbol}</Text>
              <Text style={styles.yield}>Yield: {item.yield}%</Text>
            </View>
            <Text style={styles.textValue}>Price: ${item.price.toFixed(2)}</Text>
            <Text style={styles.textValue}>Div/Share: ${item.dividendPerShare.toFixed(2)}</Text>
            <View style={styles.datesRow}>
              <Text style={styles.dateText}>Buy By: {item.buyDate}</Text>
              <Text style={styles.dateText}>Sell: {item.sellDate}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 10 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  error: { color: 'red', textAlign: 'center', marginTop: 20 },
  card: { backgroundColor: '#1C1C1E', padding: 15, borderRadius: 10, marginBottom: 10 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  symbol: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  yield: { color: '#34C759', fontSize: 16, fontWeight: 'bold' },
  textValue: { color: '#E5E5EA', fontSize: 14, marginBottom: 2 },
  datesRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  dateText: { color: '#8E8E93', fontSize: 12 }
});
