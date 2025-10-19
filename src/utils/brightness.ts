import { Buffer } from 'buffer';
import type { NormalizedRoi } from '../types';
import { decode } from 'jpeg-js';

export interface DecodedImage {
  data: Uint8Array;
  width: number;
  height: number;
}

const CHANNELS = 4;

export function decodeBase64Jpeg(base64: string): DecodedImage {
  if (!(globalThis as any).Buffer) {
    (globalThis as any).Buffer = Buffer;
  }
  const buffer = Buffer.from(base64, 'base64');
  const decoded = decode(buffer, { useTArray: true });
  return {
    data: decoded.data,
    width: decoded.width,
    height: decoded.height
  };
}

export function computeRoiBrightness(image: DecodedImage, roi: NormalizedRoi): number {
  const { data, width, height } = image;
  const halfWidth = Math.max(roi.width / 2, 0);
  const halfHeight = Math.max(roi.height / 2, 0);
  const minX = clamp(Math.floor((roi.centerX - halfWidth) * width), 0, width - 1);
  const maxX = clamp(Math.ceil((roi.centerX + halfWidth) * width), 0, width - 1);
  const minY = clamp(Math.floor((roi.centerY - halfHeight) * height), 0, height - 1);
  const maxY = clamp(Math.ceil((roi.centerY + halfHeight) * height), 0, height - 1);

  let sum = 0;
  let count = 0;

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const offset = (y * width + x) * CHANNELS;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      sum += 0.299 * r + 0.587 * g + 0.114 * b;
      count += 1;
    }
  }

  if (count === 0) {
    return 0;
  }

  return sum / count;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
