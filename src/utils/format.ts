export function formatPower(powerWatts: number | null): string {
  if (powerWatts == null || Number.isNaN(powerWatts)) {
    return '—';
  }
  if (powerWatts >= 1000) {
    return `${(powerWatts / 1000).toFixed(2)} kW`;
  }
  return `${powerWatts.toFixed(1)} W`;
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '—';
  }
  if (seconds < 60) {
    return `${seconds.toFixed(1)} s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}m ${remaining.toFixed(0)}s`;
}
