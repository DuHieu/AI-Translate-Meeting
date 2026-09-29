/**
 * Phân loại lỗi media/LiveKit theo nguyên nhân thực sự.
 * Không coi mọi lỗi là permission error.
 */

export type MediaErrorKind =
  | 'permission'   // NotAllowedError, PermissionDeniedError, SecurityError
  | 'not_found'    // NotFoundError — thiết bị không tồn tại
  | 'not_readable' // NotReadableError — thiết bị bị chiếm dụng bởi app khác
  | 'overconstrained' // OverconstrainedError — constraints không phù hợp
  | 'connection'   // NegotiationError, negotiation timed out, WebSocket failed, ICE failed
  | 'unknown';

export interface ClassifiedMediaError {
  kind: MediaErrorKind;
  originalError: unknown;
  message: string;
  name: string;
}

/** Các name/message của error được coi là permission denied */
const PERMISSION_ERROR_NAMES = new Set([
  'NotAllowedError',
  'PermissionDeniedError',
  'SecurityError',
]);

/** Keywords trong message để phân loại connection/negotiation error */
const CONNECTION_ERROR_KEYWORDS = [
  'negotiation',
  'timed out',
  'negotiation timed out',
  'websocket',
  'websocket connection',
  'ice failed',
  'ice connection',
  'connection failed',
  'ConnectionError',
  'NegotiationError',
  'signaling',
  'transport',
  'dtls',
  'srtp',
];

export function classifyMediaError(error: unknown): ClassifiedMediaError {
  const name = (error instanceof Error ? error.name : '') || '';
  const message = (error instanceof Error ? error.message : String(error)) || '';
  const lowerMsg = message.toLowerCase();
  const lowerName = name.toLowerCase();

  // 1. Permission errors — chỉ khi DOMException name khớp
  if (PERMISSION_ERROR_NAMES.has(name)) {
    return { kind: 'permission', originalError: error, message, name };
  }

  // 2. Device not found
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return { kind: 'not_found', originalError: error, message, name };
  }

  // 3. Device busy / not readable
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return { kind: 'not_readable', originalError: error, message, name };
  }

  // 4. OverconstrainedError
  if (name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError') {
    return { kind: 'overconstrained', originalError: error, message, name };
  }

  // 5. Connection/negotiation errors (từ LiveKit)
  if (
    lowerName.includes('negotiation') ||
    CONNECTION_ERROR_KEYWORDS.some((kw) => lowerMsg.includes(kw.toLowerCase())) ||
    CONNECTION_ERROR_KEYWORDS.some((kw) => lowerName.includes(kw.toLowerCase()))
  ) {
    return { kind: 'connection', originalError: error, message, name };
  }

  // 6. Unknown
  return { kind: 'unknown', originalError: error, message, name };
}

export function isPermissionError(error: unknown): boolean {
  return classifyMediaError(error).kind === 'permission';
}

export function isConnectionError(error: unknown): boolean {
  return classifyMediaError(error).kind === 'connection';
}
