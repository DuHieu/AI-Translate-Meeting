export function parseTimestampToSeconds(timestamp: string, baseEpochMs?: number): number {
  if (!timestamp) return 0;

  // Case 1: HH:MM:SS or MM:SS
  const colonParts = timestamp.split(':');
  if (colonParts.length === 2 || (colonParts.length === 3 && !timestamp.includes('T') && !timestamp.includes('-'))) {
    const nums = colonParts.map(Number);
    if (nums.every((n) => !isNaN(n))) {
      if (nums.length === 2) {
        return nums[0] * 60 + nums[1];
      }
      return nums[0] * 3600 + nums[1] * 60 + nums[2];
    }
  }

  // Case 2: ISO string or epoch
  const parsedEpoch = Date.parse(timestamp);
  if (!isNaN(parsedEpoch)) {
    if (baseEpochMs !== undefined && baseEpochMs > 0) {
      return Math.max(0, (parsedEpoch - baseEpochMs) / 1000);
    }
    return parsedEpoch / 1000;
  }

  const num = Number(timestamp);
  if (!isNaN(num)) {
    if (num > 1000000000) {
      const ms = num > 1000000000000 ? num : num * 1000;
      if (baseEpochMs !== undefined && baseEpochMs > 0) {
        return Math.max(0, (ms - baseEpochMs) / 1000);
      }
      return ms / 1000;
    }
    return Math.max(0, num);
  }

  return 0;
}

export function formatMediaTime(totalSeconds: number): string {
  if (isNaN(totalSeconds) || totalSeconds < 0) return '00:00';
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs.toString().padStart(2, '0')}:${remMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
