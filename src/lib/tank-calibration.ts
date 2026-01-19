/**
 * Tank Capacity Calibration Charts
 * Maps liquid depth (cm) to actual volume (liters) for horizontal cylinder tanks
 * Data from official tank calibration charts
 */

export type TankCapacity = 9000 | 15000 | 22500;

interface CalibrationPoint {
  depth: number;  // cm
  volume: number; // liters
}

/**
 * Calibration data for 9KL (9,000L) horizontal cylinder tank
 * Depth range: 0.5cm - 184.0cm
 * Volume range: 2.32L - 9,668.32L
 */
const CHART_9KL: CalibrationPoint[] = [
  { depth: 0.5, volume: 2.32 },
  { depth: 5.0, volume: 46.4 },
  { depth: 10.0, volume: 131.04 },
  { depth: 15.0, volume: 241.92 },
  { depth: 20.0, volume: 371.52 },
  { depth: 25.0, volume: 515.84 },
  { depth: 30.0, volume: 672.48 },
  { depth: 35.0, volume: 839.68 },
  { depth: 40.0, volume: 1016.16 },
  { depth: 45.0, volume: 1200.96 },
  { depth: 50.0, volume: 1393.12 },
  { depth: 55.0, volume: 1591.84 },
  { depth: 60.0, volume: 1796.48 },
  { depth: 65.0, volume: 2006.56 },
  { depth: 70.0, volume: 2221.6 },
  { depth: 75.0, volume: 2441.28 },
  { depth: 80.0, volume: 2665.28 },
  { depth: 85.0, volume: 2893.28 },
  { depth: 90.0, volume: 3125.12 },
  { depth: 95.0, volume: 3360.48 },
  { depth: 100.0, volume: 3599.2 },
  { depth: 105.0, volume: 3841.12 },
  { depth: 110.0, volume: 4086.08 },
  { depth: 115.0, volume: 4333.92 },
  { depth: 120.0, volume: 4584.48 },
  { depth: 125.0, volume: 4837.6 },
  { depth: 130.0, volume: 5093.12 },
  { depth: 135.0, volume: 5350.88 },
  { depth: 140.0, volume: 5610.72 },
  { depth: 145.0, volume: 5872.48 },
  { depth: 150.0, volume: 6136.0 },
  { depth: 155.0, volume: 6401.12 },
  { depth: 160.0, volume: 6667.68 },
  { depth: 165.0, volume: 6935.52 },
  { depth: 170.0, volume: 7204.48 },
  { depth: 175.0, volume: 7474.4 },
  { depth: 180.0, volume: 7745.12 },
  { depth: 184.0, volume: 9668.32 }
];

/**
 * Calibration data for 15KL (15,000L) horizontal cylinder tank
 * Depth range: 0.5cm - 215.0cm
 * Volume range: 3.13L - 15,463.03L
 */
const CHART_15KL: CalibrationPoint[] = [
  { depth: 0.5, volume: 3.13 },
  { depth: 5.0, volume: 62.6 },
  { depth: 10.0, volume: 176.78 },
  { depth: 15.0, volume: 326.26 },
  { depth: 20.0, volume: 501.09 },
  { depth: 25.0, volume: 695.65 },
  { depth: 30.0, volume: 906.26 },
  { depth: 35.0, volume: 1130.43 },
  { depth: 40.0, volume: 1367.13 },
  { depth: 45.0, volume: 1615.09 },
  { depth: 50.0, volume: 1873.3 },
  { depth: 55.0, volume: 2140.87 },
  { depth: 60.0, volume: 2416.96 },
  { depth: 65.0, volume: 2700.78 },
  { depth: 70.0, volume: 2991.65 },
  { depth: 75.0, volume: 3288.91 },
  { depth: 80.0, volume: 3591.96 },
  { depth: 85.0, volume: 3900.26 },
  { depth: 90.0, volume: 4213.3 },
  { depth: 95.0, volume: 4530.61 },
  { depth: 100.0, volume: 7573.66 },
  { depth: 105.0, volume: 5174.35 },
  { depth: 110.0, volume: 5500.87 },
  { depth: 115.0, volume: 5830.43 },
  { depth: 120.0, volume: 6162.61 },
  { depth: 125.0, volume: 6497.04 },
  { depth: 130.0, volume: 6833.39 },
  { depth: 135.0, volume: 7171.3 },
  { depth: 140.0, volume: 7510.48 },
  { depth: 145.0, volume: 7850.61 },
  { depth: 150.0, volume: 12284.8 },
  { depth: 155.0, volume: 8530.43 },
  { depth: 160.0, volume: 8869.57 },
  { depth: 165.0, volume: 9208.7 },
  { depth: 170.0, volume: 9547.39 },
  { depth: 175.0, volume: 9885.22 },
  { depth: 180.0, volume: 10221.74 },
  { depth: 185.0, volume: 10556.52 },
  { depth: 190.0, volume: 10889.13 },
  { depth: 195.0, volume: 11219.13 },
  { depth: 200.0, volume: 15798.68 },
  { depth: 205.0, volume: 11869.57 },
  { depth: 210.0, volume: 12189.13 },
  { depth: 215.0, volume: 15463.03 }
];

/**
 * Calibration data for 22.5KL (22,500L) horizontal cylinder tank
 * Depth range: 0.5cm - 244.0cm
 * Volume range: 3.79L - 24,109.27L
 */
const CHART_22_5KL: CalibrationPoint[] = [
  { depth: 0.5, volume: 3.79 },
  { depth: 5.0, volume: 75.8 },
  { depth: 10.0, volume: 214.11 },
  { depth: 15.0, volume: 395.08 },
  { depth: 20.0, volume: 606.42 },
  { depth: 25.0, volume: 842.03 },
  { depth: 30.0, volume: 1097.58 },
  { depth: 35.0, volume: 1369.73 },
  { depth: 40.0, volume: 1656.42 },
  { depth: 45.0, volume: 1956.11 },
  { depth: 50.0, volume: 2267.58 },
  { depth: 55.0, volume: 2589.89 },
  { depth: 60.0, volume: 2922.27 },
  { depth: 65.0, volume: 3264.11 },
  { depth: 70.0, volume: 3614.73 },
  { depth: 75.0, volume: 3973.58 },
  { depth: 80.0, volume: 4340.11 },
  { depth: 85.0, volume: 4713.8 },
  { depth: 90.0, volume: 5094.11 },
  { depth: 95.0, volume: 5480.58 },
  { depth: 100.0, volume: 5872.73 },
  { depth: 105.0, volume: 6270.11 },
  { depth: 110.0, volume: 6672.27 },
  { depth: 115.0, volume: 7078.8 },
  { depth: 120.0, volume: 7489.27 },
  { depth: 125.0, volume: 7903.27 },
  { depth: 130.0, volume: 8320.42 },
  { depth: 135.0, volume: 8740.27 },
  { depth: 140.0, volume: 9162.42 },
  { depth: 145.0, volume: 9586.5 },
  { depth: 150.0, volume: 10012.11 },
  { depth: 155.0, volume: 10438.89 },
  { depth: 160.0, volume: 10866.42 },
  { depth: 165.0, volume: 11294.27 },
  { depth: 170.0, volume: 11722.11 },
  { depth: 175.0, volume: 12149.58 },
  { depth: 180.0, volume: 12576.27 },
  { depth: 185.0, volume: 13001.8 },
  { depth: 190.0, volume: 13425.73 },
  { depth: 195.0, volume: 13847.73 },
  { depth: 200.0, volume: 14267.42 },
  { depth: 205.0, volume: 14684.42 },
  { depth: 210.0, volume: 15098.42 },
  { depth: 215.0, volume: 15509.11 },
  { depth: 220.0, volume: 15916.11 },
  { depth: 225.0, volume: 16319.11 },
  { depth: 230.0, volume: 16717.73 },
  { depth: 235.0, volume: 17111.73 },
  { depth: 240.0, volume: 17500.73 },
  { depth: 244.0, volume: 24109.27 }
];

export const TANK_CALIBRATION_CHARTS: Record<TankCapacity, CalibrationPoint[]> = {
  9000: CHART_9KL,
  15000: CHART_15KL,
  22500: CHART_22_5KL
};

/**
 * Converts liquid depth (cm) to volume (liters) using tank calibration chart
 * Uses linear interpolation for values between data points
 */
export function depthToVolume(
  depth: number,
  tankCapacity: TankCapacity
): number {
  const chart = TANK_CALIBRATION_CHARTS[tankCapacity];

  if (!chart) {
    throw new Error(`No calibration chart for ${tankCapacity}L tank`);
  }

  // Handle edge cases
  if (depth <= 0) return 0;
  if (depth <= chart[0].depth) return chart[0].volume;
  if (depth >= chart[chart.length - 1].depth) {
    return chart[chart.length - 1].volume;
  }

  // Find surrounding data points for interpolation
  let lower = chart[0];
  let upper = chart[1];

  for (let i = 0; i < chart.length - 1; i++) {
    if (depth >= chart[i].depth && depth <= chart[i + 1].depth) {
      lower = chart[i];
      upper = chart[i + 1];
      break;
    }
  }

  // Linear interpolation
  const depthRatio = (depth - lower.depth) / (upper.depth - lower.depth);
  const volume = lower.volume + (depthRatio * (upper.volume - lower.volume));

  return Math.round(volume * 100) / 100; // Round to 2 decimals
}

/**
 * Converts volume (liters) to liquid depth (cm) using tank calibration chart
 * Uses linear interpolation - useful for reverse calculations or validation
 */
export function volumeToDepth(
  volume: number,
  tankCapacity: TankCapacity
): number {
  const chart = TANK_CALIBRATION_CHARTS[tankCapacity];

  if (!chart) {
    throw new Error(`No calibration chart for ${tankCapacity}L tank`);
  }

  // Handle edge cases
  if (volume <= 0) return 0;
  if (volume <= chart[0].volume) return chart[0].depth;
  if (volume >= chart[chart.length - 1].volume) {
    return chart[chart.length - 1].depth;
  }

  // Find surrounding data points
  for (let i = 0; i < chart.length - 1; i++) {
    if (volume >= chart[i].volume && volume <= chart[i + 1].volume) {
      const lower = chart[i];
      const upper = chart[i + 1];
      const volumeRatio = (volume - lower.volume) / (upper.volume - lower.volume);
      const depth = lower.depth + (volumeRatio * (upper.depth - lower.depth));
      return Math.round(depth * 10) / 10; // Round to 1 decimal
    }
  }

  return 0;
}

/**
 * Validates if a depth reading is within acceptable range for the tank
 */
export function validateDepth(
  depth: number,
  tankCapacity: TankCapacity
): { valid: boolean; message?: string } {
  const chart = TANK_CALIBRATION_CHARTS[tankCapacity];
  
  if (!chart) {
    return { 
      valid: false, 
      message: `No calibration chart available for ${tankCapacity}L tank` 
    };
  }

  const maxDepth = chart[chart.length - 1].depth;

  if (depth < 0) {
    return { valid: false, message: 'Depth cannot be negative' };
  }

  if (depth > maxDepth) {
    return {
      valid: false,
      message: `Depth exceeds maximum for ${tankCapacity}L tank (max: ${maxDepth}cm)`
    };
  }

  return { valid: true };
}

/**
 * Get maximum depth for a tank capacity
 */
export function getMaxDepth(tankCapacity: TankCapacity): number {
  const chart = TANK_CALIBRATION_CHARTS[tankCapacity];
  return chart ? chart[chart.length - 1].depth : 0;
}

/**
 * Get tank capacity name for display
 */
export function getTankCapacityLabel(capacity: number): string {
  if (capacity === 9000) return '9KL';
  if (capacity === 15000) return '15KL';
  if (capacity === 22500) return '22.5KL';
  return `${capacity}L`;
}
