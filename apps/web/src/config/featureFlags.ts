/**
 * Feature Flags
 * Để bật/tắt tính năng, chỉnh VITE_PAYMENT_ENABLED trong file .env.local
 *   VITE_PAYMENT_ENABLED=true   → hiện thanh toán
 *   VITE_PAYMENT_ENABLED=false  → ẩn thanh toán (mặc định)
 */
export const PAYMENT_ENABLED = import.meta.env.VITE_PAYMENT_ENABLED === 'true';
