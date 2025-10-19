import React, { useMemo, useRef } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import type { NormalizedRoi } from '../types';
import { colors } from '../styles/colors';

interface RoiOverlayProps {
  roi: NormalizedRoi;
  containerWidth: number;
  containerHeight: number;
  editable?: boolean;
  onChange: (roi: NormalizedRoi) => void;
}

export const RoiOverlay: React.FC<RoiOverlayProps> = ({
  roi,
  containerWidth,
  containerHeight,
  editable = true,
  onChange
}) => {
  const startRef = useRef({ x: roi.centerX, y: roi.centerY });

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => editable,
        onPanResponderGrant: () => {
          startRef.current = { x: roi.centerX, y: roi.centerY };
        },
        onPanResponderMove: (_, gesture) => {
          if (!editable) {
            return;
          }
          const dx = gesture.dx / containerWidth;
          const dy = gesture.dy / containerHeight;
          const next: NormalizedRoi = {
            ...roi,
            centerX: clamp(startRef.current.x + dx, roi.width / 2, 1 - roi.width / 2),
            centerY: clamp(startRef.current.y + dy, roi.height / 2, 1 - roi.height / 2)
          };
          onChange(next);
        }
      }),
    [containerHeight, containerWidth, editable, onChange, roi]
  );

  const pixelWidth = roi.width * containerWidth;
  const pixelHeight = roi.height * containerHeight;
  const left = roi.centerX * containerWidth - pixelWidth / 2;
  const top = roi.centerY * containerHeight - pixelHeight / 2;

  return (
    <View pointerEvents={editable ? 'auto' : 'none'} style={StyleSheet.absoluteFill}>
      <View
        style={[
          styles.box,
          {
            width: pixelWidth,
            height: pixelHeight,
            left,
            top
          }
        ]}
        {...panResponder.panHandlers}
      />
    </View>
  );
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

const styles = StyleSheet.create({
  box: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: 'rgba(56, 189, 248, 0.1)'
  }
});
