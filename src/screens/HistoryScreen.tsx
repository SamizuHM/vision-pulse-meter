import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { colors } from '../styles/colors';
import type { MeasurementRecord } from '../types';
import { clearMeasurements, listMeasurements } from '../storage/database';
import { formatDuration, formatPower } from '../utils/format';

type HistoryScreenProps = {
  refreshToken: number;
};

export const HistoryScreen: React.FC<HistoryScreenProps> = ({ refreshToken }) => {
  const [records, setRecords] = useState<MeasurementRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const items = await listMeasurements();
      setRecords(items);
    } catch (err) {
      console.error('Failed to fetch measurements', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const items = await listMeasurements();
      setRecords(items);
    } catch (err) {
      console.error('Failed to fetch measurements', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshToken]);

  const handleClear = useCallback(() => {
    Alert.alert('清空历史记录', '确定要删除所有记录吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            await clearMeasurements();
            setRecords([]);
          } catch (err) {
            console.error('Failed to clear measurements', err);
          }
        }
      }
    ]);
  }, []);

  const renderItem = useCallback(({ item }: { item: MeasurementRecord }) => {
    const timestamp = new Date(item.timestamp).toLocaleString();
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{timestamp}</Text>
          <Text style={styles.cardSubtitle}>常数：{item.meterConstant}</Text>
        </View>
        <View style={styles.cardRow}>
          <Text style={styles.cardLabel}>脉冲</Text>
          <Text style={styles.cardValue}>{item.pulses}</Text>
        </View>
        <View style={styles.cardRow}>
          <Text style={styles.cardLabel}>功率</Text>
          <Text style={styles.cardValue}>{formatPower(item.powerWatts)}</Text>
        </View>
        <View style={styles.cardRow}>
          <Text style={styles.cardLabel}>时长</Text>
          <Text style={styles.cardValue}>{formatDuration(item.durationSeconds)}</Text>
        </View>
      </View>
    );
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>历史记录</Text>
        <Pressable style={styles.clearButton} onPress={handleClear}>
          <Text style={styles.clearButtonText}>清空</Text>
        </Pressable>
      </View>
      <FlatList
        data={records}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={[styles.listContent, records.length === 0 && styles.emptyContainer]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              void refresh();
            }}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          !isLoading ? <Text style={styles.emptyText}>暂无记录，开始测量后将显示历史结果。</Text> : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingTop: 16
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border
  },
  clearButtonText: {
    color: colors.textSecondary,
    fontSize: 14
  },
  listContent: {
    paddingBottom: 24
  },
  emptyContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center'
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600'
  },
  cardSubtitle: {
    color: colors.textSecondary,
    fontSize: 12
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  cardLabel: {
    color: colors.textSecondary
  },
  cardValue: {
    color: colors.textPrimary,
    fontWeight: '500'
  }
});
