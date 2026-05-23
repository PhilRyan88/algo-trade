import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Image, Dimensions } from 'react-native';
import { useDividendStocks } from '../api/queries';

const { width } = Dimensions.get('window');

// Date parsing from YYYY-MM-DD
const parseDate = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-');
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
};

const formatDate = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-');
  return `${day}-${month}-${year}`;
};

export default function DividendScreen() {
  const { data, isLoading, error } = useDividendStocks();

  const filteredData = useMemo(() => {
    if (!data) return [];
    const now = new Date();
    // Only keep dividends where the buyDate is in the future (can still be bought)
    return data.filter((item: any) => {
      const buyDate = parseDate(item.buyDate);
      return buyDate.getTime() >= now.setHours(0,0,0,0);
    });
  }, [data]);

  if (isLoading) return <ActivityIndicator style={styles.center} size="large" color="#34C759" />;
  if (error) return <Text style={styles.error}>Error fetching dividends</Text>;

  if (filteredData.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>No upcoming dividends available.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.screenTitle}>Upcoming Dividends</Text>
      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
        renderItem={({ item }) => (
          <View style={styles.glassCard}>
            <View style={styles.cardTop}>
              <Image 
                source={{ uri: `https://ui-avatars.com/api/?name=${item.symbol}&background=1A1A1A&color=34C759&size=128&bold=true&rounded=true` }}
                style={styles.logo}
              />
              <View style={styles.headerInfo}>
                <Text style={styles.symbol}>{item.symbol}</Text>
                <Text style={styles.yieldTag}>{item.yield}% Yield</Text>
              </View>
              <View style={styles.priceContainer}>
                <Text style={styles.priceLabel}>Price</Text>
                <Text style={styles.priceValue}>₹{item.price.toFixed(2)}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Div / Share</Text>
                <Text style={styles.statValue}>₹{item.dividendPerShare.toFixed(2)}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Buy Before</Text>
                <Text style={styles.statValueHighlight}>{formatDate(item.buyDate)}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Sell On</Text>
                <Text style={styles.statValue}>{formatDate(item.sellDate)}</Text>
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
    borderColor: 'rgba(52, 199, 89, 0.3)'
  },
  headerInfo: {
    flex: 1,
  },
  symbol: { 
    color: '#FFFFFF', 
    fontSize: 20, 
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4
  },
  yieldTag: { 
    color: '#34C759', 
    fontSize: 13, 
    fontWeight: '600',
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    overflow: 'hidden'
  },
  priceContainer: {
    alignItems: 'flex-end'
  },
  priceLabel: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2
  },
  priceValue: {
    color: '#FFFFFF',
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
    fontSize: 14, 
    fontWeight: '600'
  },
  statValueHighlight: {
    color: '#34C759',
    fontSize: 14, 
    fontWeight: '700'
  }
});
