import 'react-native-reanimated';
import 'react-native-gesture-handler';
import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MeasurementScreen } from './src/screens/MeasurementScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { colors } from './src/styles/colors';
import { initDatabase } from './src/storage/database';

const tabs = [
  { key: 'measure', label: '实时测量' },
  { key: 'history', label: '历史记录' }
] as const;

type TabKey = (typeof tabs)[number]['key'];

export default function App(): JSX.Element {
  const [isReady, setIsReady] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('measure');
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    const bootstrap = async () => {
      await initDatabase();
      setIsReady(true);
    };
    void bootstrap();
  }, []);

  const tabItems = useMemo(
    () =>
      tabs.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.tabButton, activeTab === tab.key && styles.tabButtonActive]}
          onPress={() => setActiveTab(tab.key)}
        >
          <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
        </TouchableOpacity>
      )),
    [activeTab]
  );

  if (!isReady) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar style="light" />
        <Text style={styles.loadingText}>正在初始化数据库…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.tabBar}>{tabItems}</View>
      {activeTab === 'measure' ? (
        <MeasurementScreen onMeasurementSaved={() => setRefreshToken((token) => token + 1)} />
      ) : (
        <HistoryScreen refreshToken={refreshToken} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background
  },
  loadingText: {
    color: colors.textSecondary
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center'
  },
  tabButtonActive: {
    backgroundColor: colors.background
  },
  tabText: {
    color: colors.textSecondary,
    fontSize: 16
  },
  tabTextActive: {
    color: colors.textPrimary,
    fontWeight: '600'
  }
});
