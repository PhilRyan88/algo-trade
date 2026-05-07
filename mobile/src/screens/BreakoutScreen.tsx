import React from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Image } from 'react-native';
import { useBreakoutStocks } from '../api/queries';

export default function BreakoutScreen() {
  const { data, isLoading, error } = useBreakoutStocks();

  if (isLoading) return <ActivityIndicator style={styles.center} size="large" color="#BF5AF2" />;
  if (error) return <Text style={styles.error}>Error fetching breakouts</Text>;

  const resolvedData = data || [];

  if (resolvedData.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>No breakout signals available.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.screenTitle}>Breakouts</Text>
      <FlatList
        data={resolvedData}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
        renderItem={({ item }) => (
          <View style={styles.glassCard}>
            <View style={styles.cardTop}>
              <Image 
                source={{ uri: `https://ui-avatars.com/api/?name=${item.symbol}&background=1A1A1A&color=BF5AF2&size=128&bold=true&rounded=true` }}
                style={styles.logo}
              />
              <View style={styles.headerInfo}>
                <Text style={styles.symbol}>{item.symbol}</Text>
                <View style={styles.typeTag}>
                  <Text style={styles.typeTagText}>Momentum</Text>
                </View>
              </View>
              <View style={styles.confidenceContainer}>
                <Text style={styles.confidenceLabel}>Confidence</Text>
                <Text style={styles.confidenceValue}>{item.confidence}%</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Entry</Text>
                <Text style={styles.statValue}>₹{item.entry}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Target</Text>
                <Text style={[styles.statValueHighlight, { color: '#34C759' }]}>₹{item.target}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Stop Loss</Text>
                <Text style={[styles.statValueHighlight, { color: '#FF453A' }]}>₹{item.stoploss}</Text>
              </View>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#0A0A0A', 
    paddingHorizontal: 16,
    paddingTop: 10
  },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#0A0A0A'
  },
  emptyText: {
    color: '#8E8E93',
    fontSize: 16,
    fontWeight: '500'
  },
  error: { 
    color: '#FF453A', 
    textAlign: 'center', 
    marginTop: 20,
    fontSize: 16,
    fontWeight: '600'
  },
  screenTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 20,
    marginTop: 10,
    letterSpacing: 0.5
  },
  glassCard: { 
    backgroundColor: 'rgba(255, 255, 255, 0.05)', 
    padding: 20, 
    borderRadius: 24, 
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10
  },
  cardTop: { 
    flexDirection: 'row', 
    alignItems: 'center',
    marginBottom: 16
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(191, 90, 242, 0.3)'
  },
  headerInfo: {
    flex: 1,
    alignItems: 'flex-start'
  },
  symbol: { 
    color: '#FFFFFF', 
    fontSize: 18, 
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6
  },
  typeTag: { 
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(191, 90, 242, 0.2)'
  },
  typeTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#BF5AF2'
  },
  confidenceContainer: {
    alignItems: 'flex-end'
  },
  confidenceLabel: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2
  },
  confidenceValue: {
    color: '#34C759',
    fontSize: 18,
    fontWeight: '700'
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 16
  },
  statsRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between',
  },
  statBox: {
    alignItems: 'flex-start',
  },
  statLabel: { 
    color: '#8E8E93', 
    fontSize: 12, 
    fontWeight: '500',
    marginBottom: 6
  },
  statValue: { 
    color: '#E5E5EA', 
    fontSize: 15, 
    fontWeight: '600'
  },
  statValueHighlight: {
    fontSize: 15, 
    fontWeight: '700'
  }
});
