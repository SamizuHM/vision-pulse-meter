export interface NormalizedRoi {
  /** Center X coordinate expressed as 0-1 relative to the preview width. */
  centerX: number;
  /** Center Y coordinate expressed as 0-1 relative to the preview height. */
  centerY: number;
  /** ROI width expressed as a ratio (0-1) of the preview width. */
  width: number;
  /** ROI height expressed as a ratio (0-1) of the preview height. */
  height: number;
}

export interface MeasurementStats {
  pulses: number;
  durationSeconds: number;
  powerWatts: number | null;
  startedAt: number | null;
}

export interface MeasurementRecord {
  id: number;
  timestamp: number;
  meterConstant: number;
  pulses: number;
  durationSeconds: number;
  powerWatts: number | null;
}
