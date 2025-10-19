import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Camera, CameraType } from 'expo-camera';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import Slider from '@react-native-community/slider';
import { RoiOverlay } from '../components/RoiOverlay';
import { colors } from '../styles/colors';
import { useMeterRecorder } from '../hooks/useMeterRecorder';
import type { MeasurementRecord, NormalizedRoi } from '../types';
import { insertMeasurement } from '../storage/database';
import { formatDuration, formatPower } from '../utils/format';

type MeasurementScreenProps = {
  onMeasurementSaved?: (record: MeasurementRecord) => void;
};

export const MeasurementScreen: React.FC<MeasurementScreenProps> = ({ onMeasurementSaved }) => {
  const cameraRef = useRef<Camera | null>(null);
  const [permissionStatus, requestPermission] = Camera.useCameraPermissions();
  const [meterConstantInput, setMeterConstantInput] = useState('3200');
  const [roi, setRoi] = useState<NormalizedRoi>({ centerX: 0.5, centerY: 0.5, width: 0.25, height: 0.25 });
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const [isSaving, setIsSaving] = useState(false);

  const meterConstant = Number(meterConstantInput);

  const { isMeasuring, stats, lastBrightness, startMeasurement, stopMeasurement, error } = useMeterRecorder({
    cameraRef,
    roi,
    meterConstant
  });

  useEffect(() => {
    if (!permissionStatus) {
      void requestPermission();
    }
  }, [permissionStatus, requestPermission]);

  useEffect(() => {
    return () => {
      deactivateKeepAwake();
    };
  }, []);

  useEffect(() => {
    if (isMeasuring) {
      void activateKeepAwakeAsync('measurement');
    } else {
      deactivateKeepAwake();
    }
  }, [isMeasuring]);

  const handleToggleMeasurement = useCallback(async () => {
    if (isMeasuring) {
      const result = await stopMeasurement();
      if (result && result.pulses > 0 && result.durationSeconds > 0) {
        setIsSaving(true);
        const record: Omit<MeasurementRecord, 'id'> = {
          timestamp: result.startedAt ?? Date.now(),
          meterConstant,
          pulses: result.pulses,
          durationSeconds: result.durationSeconds,
          powerWatts: result.powerWatts ?? null
        };
        try {
          const id = await insertMeasurement(record);
          onMeasurementSaved?.({ id, ...record });
        } catch (err) {
          console.error('Failed to save measurement', err);
        } finally {
          setIsSaving(false);
        }
      }
      return;
    }
    await startMeasurement();
  }, [isMeasuring, meterConstant, onMeasurementSaved, startMeasurement, stopMeasurement]);

  const permissionDenied = permissionStatus?.status === 'denied';

  if (!permissionStatus) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.hint}>正在检查相机权限…</Text>
      </View>
    );
  }

  if (permissionDenied) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>需要相机权限才能继续。请在系统设置中开启权限。</Text>
        <Pressable style={styles.primaryButton} onPress={() => void requestPermission()}>
          <Text style={styles.primaryButtonText}>重新请求权限</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <View style={styles.cameraContainer} onLayout={(event) => setLayout(event.nativeEvent.layout)}>
        <Camera ref={cameraRef} style={styles.camera} type={CameraType.back} ratio="16:9" />
        {layout.width > 0 && layout.height > 0 && (
          <RoiOverlay
            containerWidth={layout.width}
            containerHeight={layout.height}
            roi={roi}
            editable={!isMeasuring}
            onChange={setRoi}
          />
        )}
      </View>

      <View style={styles.panel}>
        <View style={styles.row}>
          <Text style={styles.label}>电表常数 (次/度)</Text>
          <TextInput
            style={styles.input}
            value={meterConstantInput}
            onChangeText={setMeterConstantInput}
            keyboardType="numeric"
            placeholder="请输入电表常数"
            placeholderTextColor={colors.textSecondary}
            editable={!isMeasuring}
          />
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>ROI 宽度</Text>
          <Slider
            style={styles.slider}
            minimumValue={0.05}
            maximumValue={0.8}
            step={0.01}
            value={roi.width}
            onValueChange={(value) =>
              setRoi((prev) => {
                const half = value / 2;
                return {
                  ...prev,
                  width: value,
                  centerX: clamp(prev.centerX, half, 1 - half)
                };
              })
            }
            disabled={isMeasuring}
            minimumTrackTintColor={colors.primary}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.primary}
          />
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>ROI 高度</Text>
          <Slider
            style={styles.slider}
            minimumValue={0.05}
            maximumValue={0.8}
            step={0.01}
            value={roi.height}
            onValueChange={(value) =>
              setRoi((prev) => {
                const half = value / 2;
                return {
                  ...prev,
                  height: value,
                  centerY: clamp(prev.centerY, half, 1 - half)
                };
              })
            }
            disabled={isMeasuring}
            minimumTrackTintColor={colors.primary}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.primary}
          />
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>脉冲</Text>
            <Text style={styles.statValue}>{stats.pulses}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>功率</Text>
            <Text style={styles.statValue}>{formatPower(stats.powerWatts)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>时长</Text>
            <Text style={styles.statValue}>{formatDuration(stats.durationSeconds)}</Text>
          </View>
        </View>

        <Text style={styles.brightness}>当前亮度：{lastBrightness ? lastBrightness.toFixed(1) : '—'}</Text>

        <Pressable
          style={[styles.primaryButton, isMeasuring ? styles.stopButton : undefined]}
          onPress={handleToggleMeasurement}
          disabled={isSaving}
        >
          <Text style={styles.primaryButtonText}>{isMeasuring ? '停止测量' : '开始测量'}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  cameraContainer: {
    flex: 1,
    position: 'relative'
  },
  camera: {
    flex: 1
  },
  panel: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border
  },
  row: {
    marginBottom: 16
  },
  label: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 4
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border
  },
  slider: {
    width: '100%',
    height: 40
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  statBox: {
    flex: 1,
    marginHorizontal: 4,
    padding: 12,
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 6
  },
  statValue: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600'
  },
  brightness: {
    color: colors.textSecondary,
    marginBottom: 16,
    textAlign: 'center'
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center'
  },
  stopButton: {
    backgroundColor: colors.danger
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  errorText: {
    color: colors.danger,
    textAlign: 'center',
    marginBottom: 12
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.background
  },
  hint: {
    color: colors.textSecondary,
    marginTop: 12
  }
});
