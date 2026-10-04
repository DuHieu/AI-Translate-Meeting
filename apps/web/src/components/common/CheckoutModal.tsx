import React, { useEffect, useState, useRef, useCallback } from 'react';
import { X, Check, Copy, Zap, Clock, ShieldCheck, Loader2 } from 'lucide-react';
import { meetingApi, PaymentOrderResponse } from '../../api/meetingApi';

export interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  meetingCode?: string;
  initialPlanId?: string;
  onPaymentSuccess?: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  meetingCode,
  initialPlanId = 'pro',
  onPaymentSuccess,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<string>(initialPlanId);
  const [order, setOrder] = useState<PaymentOrderResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPaid, setIsPaid] = useState<boolean>(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const pollingRef = useRef<number | null>(null);

  const fetchOrder = useCallback(async (planId: string) => {
    setIsLoading(true);
    setIsPaid(false);
    try {
      const newOrder = await meetingApi.createPaymentOrder(planId, meetingCode);
      setOrder(newOrder);
    } catch (e) {
      console.error('Failed to create payment order:', e);
    } finally {
      setIsLoading(false);
    }
  }, [meetingCode]);

  useEffect(() => {
    if (isOpen) {
      fetchOrder(selectedPlan);
    } else {
      if (pollingRef.current) {
        window.clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      setOrder(null);
      setIsPaid(false);
    }
  }, [isOpen, selectedPlan, fetchOrder]);

  // Polling order status
  useEffect(() => {
    if (!isOpen || !order || isPaid) return;

    pollingRef.current = window.setInterval(async () => {
      try {
        const latest = await meetingApi.getPaymentOrder(order.orderCode);
        if (latest.status.toLowerCase() === 'paid') {
          setIsPaid(true);
          onPaymentSuccess?.();
          if (pollingRef.current) {
            window.clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        } else if (order.status.toLowerCase() !== 'pending') {
          if (pollingRef.current) {
            window.clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 2_500);

    return () => {
      if (pollingRef.current) {
        window.clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [isOpen, order, isPaid, onPaymentSuccess]);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950 p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng thanh toán"
          className="absolute right-4 top-4 rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-5">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-sky-500/15 px-2 py-0.5 text-xs font-semibold text-sky-400">VietQR Napas 247</span>
            <span className="text-xs text-zinc-400">Tự động kích hoạt trong 3s</span>
          </div>
          <h2 className="mt-2 text-xl font-bold text-white">Nâng cấp LayaMeet Pro</h2>
        </div>

        {/* Plan Selector */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
          <button
            type="button"
            onClick={() => setSelectedPlan('pro')}
            className={`rounded-xl border p-2.5 text-left transition cursor-pointer ${
              selectedPlan === 'pro'
                ? 'border-sky-500 bg-sky-950/40 ring-1 ring-sky-500/30'
                : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-sky-400">Team Pro</span>
              <Zap className="h-3.5 w-3.5 text-sky-400" />
            </div>
            <p className="mt-1 text-xs font-bold text-white">499.000đ / tháng</p>
            <p className="text-[10px] text-zinc-400">Không giới hạn</p>
          </button>

          <button
            type="button"
            onClick={() => setSelectedPlan('pass')}
            className={`rounded-xl border p-2.5 text-left transition cursor-pointer ${
              selectedPlan === 'pass'
                ? 'border-sky-500 bg-sky-950/40 ring-1 ring-sky-500/30'
                : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-amber-400">Vé 24h</span>
              <Clock className="h-3.5 w-3.5 text-amber-400" />
            </div>
            <p className="mt-1 text-xs font-bold text-white">99.000đ / 24h</p>
            <p className="text-[10px] text-zinc-400">Dùng trong ngày</p>
          </button>

          <button
            type="button"
            onClick={() => setSelectedPlan('pass_1h')}
            className={`rounded-xl border p-2.5 text-left transition cursor-pointer ${
              selectedPlan === 'pass_1h'
                ? 'border-sky-500 bg-sky-950/40 ring-1 ring-sky-500/30'
                : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-emerald-400">Vé 1 Giờ</span>
              <Zap className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <p className="mt-1 text-xs font-bold text-white">39.000đ / 1h</p>
            <p className="text-[10px] text-zinc-400">Họp gấp 1 giờ</p>
          </button>

          <button
            type="button"
            onClick={() => setSelectedPlan('credits_500m')}
            className={`rounded-xl border p-2.5 text-left transition cursor-pointer ${
              selectedPlan === 'credits_500m'
                ? 'border-sky-500 bg-sky-950/40 ring-1 ring-sky-500/30'
                : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-purple-400">500 Phút AI</span>
              <Clock className="h-3.5 w-3.5 text-purple-400" />
            </div>
            <p className="mt-1 text-xs font-bold text-white">199.000đ</p>
            <p className="text-[10px] text-zinc-400">Trừ theo phút nói</p>
          </button>
        </div>

        {isPaid ? (
          <div className="my-6 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
              <Check className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-emerald-300">Thanh toán thành công! Gói Pro đã được kích hoạt</h3>
            <p className="mt-1 text-xs text-zinc-400">Phòng họp của bạn đã được nâng cấp không giới hạn thời lượng.</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
            >
              Tiếp tục cuộc họp
            </button>
          </div>
        ) : isLoading || !order ? (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
            <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
            <p className="mt-3 text-xs">Đang khởi tạo mã VietQR thanh toán…</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center bg-zinc-900/50 rounded-2xl border border-zinc-800 p-4">
            {/* QR Code */}
            <div className="flex flex-col items-center">
              <div className="rounded-xl border border-zinc-700 bg-white p-2 shadow-lg">
                <img
                  src={order.qrUrl}
                  alt="Mã VietQR thanh toán"
                  className="h-48 w-48 object-contain"
                />
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Đang chờ chuyển khoản (Tự nhận diện)…</span>
              </div>
            </div>

            {/* Transfer Details */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-zinc-800">
                <span className="text-zinc-400">Ngân hàng</span>
                <span className="font-semibold text-white">{order.bankId}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-zinc-800">
                <span className="text-zinc-400">Số tài khoản</span>
                <button
                  type="button"
                  onClick={() => handleCopy(order.accountNumber, 'acc')}
                  className="inline-flex items-center gap-1 font-mono font-bold text-sky-400 hover:text-sky-300"
                >
                  {order.accountNumber}
                  {copiedField === 'acc' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-zinc-800">
                <span className="text-zinc-400">Chủ tài khoản</span>
                <span className="font-semibold text-white uppercase">{order.accountName}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-zinc-800">
                <span className="text-zinc-400">Số tiền</span>
                <span className="font-bold text-emerald-400">{order.amount.toLocaleString('vi-VN')} VNĐ</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-zinc-800">
                <span className="text-zinc-400">Nội dung chuyển khoản</span>
                <button
                  type="button"
                  onClick={() => handleCopy(order.orderCode, 'memo')}
                  className="inline-flex items-center gap-1 font-mono font-bold text-amber-400 hover:text-amber-300"
                >
                  {order.orderCode}
                  {copiedField === 'memo' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between text-[11px] text-zinc-500">
          <span className="flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-sky-500" /> Bảo mật giao dịch Napas 247
          </span>
          <span>Hỗ trợ kỹ thuật 24/7</span>
        </div>
      </div>
    </div>
  );
};
