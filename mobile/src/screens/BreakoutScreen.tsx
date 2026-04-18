import React from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useBreakoutStocks } from '../api/queries';

export default function BreakoutScreen() {
  const { data, isLoading, error } = useBreakoutStocks();

  if (isLoading) return <ActivityIndicator style={styles.center} size="large" color="#007AFF" />;
  if (error) return <Text style={styles.error}>Error fetching breakouts</Text>;

  const mockData = data || [
    { id: '1', symbol: 'AAPL', entry: 150.5, target: 165.0, stoploss: 145.0, confidence: 85 },
    { id: '2', symbol: 'TSLA', entry: 210.0, target: 240.0, stoploss: 195.0, confidence: 78 }
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
              <Text style={styles.confidence}>Conf: {item.confidence}%</Text>
            </View>
            <View style={styles.detailsRow}>
              <Text style={styles.textValue}>Entry: {item.entry}</Text>
              <Text style={[styles.textValue, { color: '#34C759' }]}>Target: {item.target}</Text>
              <Text style={[styles.textValue, { color: '#FF3B30' }]}>SL: {item.stoploss}</Text>
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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  symbol: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  confidence: { color: '#007AFF', fontSize: 14 },
  detailsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  textValue: { color: '#8E8E93', fontSize: 14 }
});
