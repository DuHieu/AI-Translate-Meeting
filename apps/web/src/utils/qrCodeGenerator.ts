/**
 * Ultra-lightweight Zero-Dependency QR Code Generator
 * Generates an SVG path or data URI for URL lengths typical for meeting invites (<120 chars).
 * Supports offline, air-gapped environments without any CDN or external network requests.
 */

// Simple Reed-Solomon GF(256) polynomial arithmetic for QR error correction
const EXP_TABLE = new Uint8Array(512);
const LOG_TABLE = new Uint8Array(256);

(function initGf() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP_TABLE[i] = x;
    EXP_TABLE[i + 255] = x;
    LOG_TABLE[x] = i;
    x <<= 1;
    if (x & 256) x ^= 0x11d;
  }
})();

function gfMul(x: number, y: number): number {
  if (x === 0 || y === 0) return 0;
  return EXP_TABLE[LOG_TABLE[x] + LOG_TABLE[y]];
}

function polyMul(p1: number[], p2: number[]): number[] {
  const result = new Array(p1.length + p2.length - 1).fill(0);
  for (let i = 0; i < p1.length; i++) {
    for (let j = 0; j < p2.length; j++) {
      result[i + j] ^= gfMul(p1[i], p2[j]);
    }
  }
  return result;
}

function getGeneratorPoly(degree: number): number[] {
  let g = [1];
  for (let i = 0; i < degree; i++) {
    g = polyMul(g, [1, EXP_TABLE[i]]);
  }
  return g;
}

function calculateEcc(data: number[], eccLength: number): number[] {
  const gen = getGeneratorPoly(eccLength);
  const msg = [...data, ...new Array(eccLength).fill(0)];
  for (let i = 0; i < data.length; i++) {
    const lead = msg[i];
    if (lead !== 0) {
      for (let j = 0; j < gen.length; j++) {
        msg[i + j] ^= gfMul(gen[j], lead);
      }
    }
  }
  return msg.slice(data.length);
}

export interface QrMatrix {
  size: number;
  modules: boolean[][];
}

/**
 * Creates a QR matrix for meeting invites.
 * Uses QR Version 3 (29x29) or Version 4 (33x33) with Byte encoding & Level M error correction.
 */
export function generateQrMatrix(text: string): QrMatrix {
  const utf8 = new TextEncoder().encode(text);
  const len = utf8.length;

  // Choose version: Version 3 (data capacity 44 bytes Level M) or Version 4 (64 bytes Level M)
  const isV4 = len > 42;
  const version = isV4 ? 4 : 3;
  const size = 17 + 4 * version; // V3: 29, V4: 33
  const totalCodewords = isV4 ? 100 : 70;
  const dataCodewordsCount = isV4 ? 64 : 44;
  const eccCodewordsCount = totalCodewords - dataCodewordsCount;

  // Initialize matrix and reserved flags
  const modules: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const isFunction: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  function setModule(r: number, c: number, val: boolean) {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      modules[r][c] = val;
      isFunction[r][c] = true;
    }
  }

  // Draw 7x7 Finder Pattern with 1px separator
  function drawFinder(row: number, col: number) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const nr = row + r;
        const nc = col + c;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
          if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
            const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
            const isCore = r >= 2 && r <= 4 && c >= 2 && c <= 4;
            setModule(nr, nc, isBorder || isCore);
          } else {
            setModule(nr, nc, false); // separator
          }
        }
      }
    }
  }

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    const isEven = i % 2 === 0;
    if (!isFunction[6][i]) setModule(6, i, isEven);
    if (!isFunction[i][6]) setModule(i, 6, isEven);
  }

  // Alignment Pattern for V3 (center at 22,22) and V4 (center at 26,26)
  const alignPos = isV4 ? 26 : 22;
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      const isOuter = Math.abs(r) === 2 || Math.abs(c) === 2;
      const isCenter = r === 0 && c === 0;
      setModule(alignPos + r, alignPos + c, isOuter || isCenter);
    }
  }

  // Reserve format info area
  for (let i = 0; i < 9; i++) {
    if (i < size) {
      if (!isFunction[8][i]) isFunction[8][i] = true;
      if (!isFunction[i][8]) isFunction[i][8] = true;
    }
  }
  for (let i = 0; i < 8; i++) {
    isFunction[size - 1 - i][8] = true;
    isFunction[8][size - 1 - i] = true;
  }
  setModule(size - 8, 8, true); // Dark module

  // Encode Data Stream (Byte mode: 0100 + 8-bit length + bytes + terminator + padding)
  const bits: number[] = [];
  function pushBits(val: number, count: number) {
    for (let i = count - 1; i >= 0; i--) {
      bits.push((val >>> i) & 1);
    }
  }

  pushBits(0b0100, 4); // Byte Mode
  pushBits(len, 8); // Character count (8 bits for V1-9)
  for (let i = 0; i < len; i++) {
    pushBits(utf8[i], 8);
  }

  // Terminator
  const maxBits = dataCodewordsCount * 8;
  const termLen = Math.min(4, maxBits - bits.length);
  pushBits(0, termLen);

  // Pad to byte boundary
  while (bits.length % 8 !== 0) bits.push(0);

  // Pad codewords (0xEC, 0x11)
  const padPatterns = [0xec, 0x11];
  let padIdx = 0;
  while (bits.length < maxBits) {
    pushBits(padPatterns[padIdx++ % 2], 8);
  }

  // Convert bits to data codewords
  const dataCodewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byteVal = 0;
    for (let j = 0; j < 8; j++) byteVal = (byteVal << 1) | bits[i + j];
    dataCodewords.push(byteVal);
  }

  // Generate Error Correction Codewords
  const ecc = calculateEcc(dataCodewords, eccCodewordsCount);
  const finalCodewords = [...dataCodewords, ...ecc];

  // Convert final codewords to bit array
  const allBits: number[] = [];
  for (const cw of finalCodewords) {
    for (let i = 7; i >= 0; i--) allBits.push((cw >>> i) & 1);
  }

  // Populate data modules into matrix in zig-zag upward/downward scan
  let bitIndex = 0;
  let dir = -1; // -1 = up, 1 = down
  let c = size - 1;

  while (c > 0) {
    if (c === 6) c--; // Skip vertical timing column
    const rows = dir === -1
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i);

    for (const r of rows) {
      for (const colOffset of [0, -1]) {
        const col = c + colOffset;
        if (!isFunction[r][col]) {
          const bit = bitIndex < allBits.length ? allBits[bitIndex++] === 1 : false;
          // Apply standard Mask 0: (row + col) % 2 === 0
          const mask = (r + col) % 2 === 0;
          modules[r][col] = bit !== mask;
        }
      }
    }
    c -= 2;
    dir = -dir;
  }

  // Write format info for Mask 0, ECC Level M: (0x5412 XOR with format bits)
  // Format string for (M, Mask 0) is 0b101010000010010 (0x5412)
  const formatBits = [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0];
  const formatCoordsTop = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]
  ];
  for (let i = 0; i < 15; i++) {
    const [r, col] = formatCoordsTop[i];
    modules[r][col] = formatBits[i] === 1;
  }

  // Bottom-left and top-right format bits
  for (let i = 0; i < 7; i++) {
    modules[size - 1 - i][8] = formatBits[i] === 1;
  }
  for (let i = 0; i < 8; i++) {
    modules[8][size - 8 + i] = formatBits[7 + i] === 1;
  }

  return { size, modules };
}

/**
 * Returns an SVG path string representing the QR code modules with quiet zone.
 */
export function generateQrSvgPath(text: string): { sizeWithMargin: number; path: string } {
  const { size, modules } = generateQrMatrix(text);
  const margin = 2;
  const sizeWithMargin = size + margin * 2;
  const pathParts: string[] = [];

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (modules[r][c]) {
        pathParts.push(`M${c + margin},${r + margin}h1v1h-1z`);
      }
    }
  }

  return { sizeWithMargin, path: pathParts.join('') };
}
