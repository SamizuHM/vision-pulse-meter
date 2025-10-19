import { useCallback, useEffect, useRef, useState } from 'react';
import type { Camera } from 'expo-camera';
import type { NormalizedRoi, MeasurementStats } from '../types';
import { computeRoiBrightness, decodeBase64Jpeg } from '../utils/brightness';

interface UseMeterRecorderParams {
  cameraRef: React.RefObject<Camera>;
  roi: NormalizedRoi;
  meterConstant: number;
  sampleIntervalMs?: number;
}

interface UseMeterRecorderResult {
  isMeasuring: boolean;
  stats: MeasurementStats;
  lastBrightness: number | null;
  startMeasurement: () => Promise<void>;
  stopMeasurement: () => Promise<MeasurementStats | null>;
  error: string | null;
}

const DEFAULT_INTERVAL = 250;
const MIN_PULSE_INTERVAL_MS = 200;
const MIN_BRIGHTNESS_DELTA = 8;
const VARIANCE_MULTIPLIER = 1.5;

function computePower(pulses: number, durationSeconds: number, meterConstant: number): number | null {
  if (pulses <= 0 || durationSeconds <= 0 || meterConstant <= 0) {
    return null;
  }
  return (pulses * 3600000) / (meterConstant * durationSeconds);
}

export function useMeterRecorder({
  cameraRef,
  roi,
  meterConstant,
  sampleIntervalMs = DEFAULT_INTERVAL
}: UseMeterRecorderParams): UseMeterRecorderResult {
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [stats, setStats] = useState<MeasurementStats>({
    pulses: 0,
    durationSeconds: 0,
    powerWatts: null,
    startedAt: null
  });
  const [lastBrightness, setLastBrightness] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const capturingRef = useRef(false);
  const emaRef = useRef<number | null>(null);
  const varianceRef = useRef(0);
  const lastPulseRef = useRef(0);
  const pulsesRef = useRef(0);
  const startTimestampRef = useRef<number | null>(null);

  const resetState = useCallback(() => {
    setStats({ pulses: 0, durationSeconds: 0, powerWatts: null, startedAt: null });
    setLastBrightness(null);
    setError(null);
    emaRef.current = null;
    varianceRef.current = 0;
    lastPulseRef.current = 0;
    pulsesRef.current = 0;
    startTimestampRef.current = null;
  }, []);

  const updateStats = useCallback(
    (timestamp: number) => {
      setStats((prev) => {
        const startedAt = startTimestampRef.current ?? prev.startedAt;
        if (!startedAt) {
          return {
            pulses: pulsesRef.current,
            durationSeconds: 0,
            powerWatts: null,
            startedAt: timestamp
          };
        }
        const durationSeconds = (timestamp - startedAt) / 1000;
        return {
          pulses: pulsesRef.current,
          durationSeconds,
          powerWatts: computePower(pulsesRef.current, durationSeconds, meterConstant),
          startedAt
        };
      });
    },
    [meterConstant]
  );

  const processBrightness = useCallback(
    (brightness: number) => {
      const timestamp = Date.now();
      const ema = emaRef.current;
      const alpha = 0.2;
      if (ema == null) {
        emaRef.current = brightness;
        varianceRef.current = 0;
        updateStats(timestamp);
        return;
      }

      const delta = brightness - ema;
      emaRef.current = ema + alpha * delta;
      varianceRef.current = (1 - alpha) * varianceRef.current + alpha * delta * delta;

      const threshold = Math.max(
        MIN_BRIGHTNESS_DELTA,
        Math.sqrt(Math.max(varianceRef.current, 0)) * VARIANCE_MULTIPLIER
      );

      if (delta > threshold && timestamp - lastPulseRef.current > MIN_PULSE_INTERVAL_MS) {
        lastPulseRef.current = timestamp;
        pulsesRef.current += 1;
      }

      updateStats(timestamp);
    },
    [updateStats]
  );

  const captureFrame = useCallback(async () => {
    if (capturingRef.current || !cameraRef.current) {
      return;
    }
    capturingRef.current = true;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        skipProcessing: true,
        base64: true,
        quality: 0.2
      });
      if (!photo.base64) {
        return;
      }
      const decoded = decodeBase64Jpeg(photo.base64);
      const brightness = computeRoiBrightness(decoded, roi);
      setLastBrightness(brightness);
      processBrightness(brightness);
    } catch (err) {
      console.error('Frame capture failed', err);
      setError('无法捕捉相机帧，请检查相机权限或降低采样频率。');
      await stopMeasurement();
    } finally {
      capturingRef.current = false;
    }
  }, [cameraRef, processBrightness, roi]);

  const startMeasurement = useCallback(async () => {
    if (isMeasuring) {
      return;
    }
    if (!cameraRef.current) {
      setError('相机尚未就绪');
      return;
    }
    if (!Number.isFinite(meterConstant) || meterConstant <= 0) {
      setError('请先输入有效的电表常数');
      return;
    }
    resetState();
    const timestamp = Date.now();
    startTimestampRef.current = timestamp;
    setStats({ pulses: 0, durationSeconds: 0, powerWatts: null, startedAt: timestamp });
    setIsMeasuring(true);
    intervalRef.current = setInterval(() => {
      void captureFrame();
    }, sampleIntervalMs);
  }, [captureFrame, cameraRef, isMeasuring, meterConstant, resetState, sampleIntervalMs]);

  const stopMeasurement = useCallback(async () => {
    if (!isMeasuring) {
      return null;
    }
    setIsMeasuring(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    const now = Date.now();
    updateStats(now);
    const startedAt = startTimestampRef.current;
    const durationSeconds = startedAt ? (now - startedAt) / 1000 : 0;
    const powerWatts = computePower(pulsesRef.current, durationSeconds, meterConstant);
    startTimestampRef.current = null;
    return {
      pulses: pulsesRef.current,
      durationSeconds,
      powerWatts,
      startedAt
    };
  }, [isMeasuring, meterConstant, updateStats]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    isMeasuring,
    stats,
    lastBrightness,
    startMeasurement,
    stopMeasurement,
    error
  };
}
