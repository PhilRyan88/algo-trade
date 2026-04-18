import React from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useOptionsSignals } from '../api/queries';

export default function OptionsScreen() {
  const { data, isLoading, error } = useOptionsSignals();

  if (isLoading) return <ActivityIndicator style={styles.center} size="large" color="#007AFF" />;
  if (error) return <Text style={styles.error}>Error fetching options signals</Text>;

  const mockData = data || [
    { id: '1', symbol: 'NIFTY', type: 'CE', strike: 22000, entry: 150, target: 200, sl: 120, confidence: 85 },
    { id: '2', symbol: 'BANKNIFTY', type: 'PE', strike: 46000, entry: 300, target: 450, sl: 220, confidence: 90 }
  ];

  return (
    <View style={styles.container}>
      <FlatList
        data={mockData.filter((d: any) => d.confidence >= 75)}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.headerRow}>
              <Text style={styles.symbol}>{item.symbol} {item.strike} {item.type}</Text>
              <View style={[styles.badge, { backgroundColor: item.type === 'CE' ? '#34C759' : '#FF3B30' }]}>
                <Text style={styles.badgeText}>{item.type}</Text>
              </View>
            </View>
            <View style={styles.detailsRow}>
              <Text style={styles.textValue}>Entry: {item.entry}</Text>
              <Text style={[styles.textValue, { color: '#34C759' }]}>Target: {item.target}</Text>
              <Text style={[styles.textValue, { color: '#FF3B30' }]}>SL: {item.sl}</Text>
            </View>
            <Text style={styles.confidence}>Confidence: {item.confidence}%</Text>
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
  card: { backgroundColor: '#1C1C1E', padding: 15, borderRadius: 10, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#007AFF' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  symbol: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  detailsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  textValue: { color: '#E5E5EA', fontSize: 14 },
  confidence: { color: '#8E8E93', fontSize: 12, textAlign: 'right', marginTop: 5 }
});
