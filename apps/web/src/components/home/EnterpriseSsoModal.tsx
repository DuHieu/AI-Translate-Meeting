import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Loader2,
  LockKeyhole,
  Mail,
  X,
} from 'lucide-react';
import {
  EnterpriseDomainValidation,
  meetingApi,
  SsoProvider,
} from '../../api/meetingApi';

interface EnterpriseSsoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProviderIcon: React.FC<{ provider: SsoProvider }> = ({ provider }) => {
  if (provider.icon === 'microsoft' || provider.id === 'microsoft365') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path fill="#f25022" d="M2 2h9v9H2z" />
        <path fill="#7fba00" d="M13 2h9v9h-9z" />
        <path fill="#00a4ef" d="M2 13h9v9H2z" />
        <path fill="#ffb900" d="M13 13h9v9h-9z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="#4285f4"
        d="M21.35 12.2c0-.7-.06-1.2-.2-1.72H12v3.53h5.37a4.6 4.6 0 0 1-2 2.94l2.91 2.26c1.7-1.57 3.07-3.89 3.07-7.01Z"
      />
      <path
        fill="#34a853"
        d="M12 21.7c2.61 0 4.8-.86 6.4-2.34l-2.91-2.26c-.81.54-1.84.92-3.49.92-2.52 0-4.66-1.7-5.42-4l-3.01 2.33A9.67 9.67 0 0 0 12 21.7Z"
      />
      <path
        fill="#fbbc04"
        d="M6.58 14.02A5.8 5.8 0 0 1 6.28 12c0-.7.12-1.38.3-2.02L3.57 7.65A9.66 9.66 0 0 0 2.5 12c0 1.56.37 3.02 1.07 4.35l3.01-2.33Z"
      />
      <path
        fill="#ea4335"
        d="M12 5.98c1.83 0 3.08.79 3.79 1.45l2.67-2.61A9.13 9.13 0 0 0 12 2.3a9.67 9.67 0 0 0-8.43 5.35l3.01 2.33c.76-2.3 2.9-4 5.42-4Z"
      />
    </svg>
  );
};

export const EnterpriseSsoModal: React.FC<EnterpriseSsoModalProps> = ({
  isOpen,
  onClose,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [email, setEmail] = useState('');
  const [providers, setProviders] = useState<SsoProvider[]>([]);
  const [domainValidation, setDomainValidation] =
    useState<EnterpriseDomainValidation | null>(null);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [validatingDomain, setValidatingDomain] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
      closeButtonRef.current?.focus();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    setEmail('');
    setDomainValidation(null);
    setError(null);
    setLoadingProviders(true);

    void meetingApi
      .getSsoProviders()
      .then((result) => {
        if (active) setProviders(result);
      })
      .catch((err: unknown) => {
        if (active) {
          setProviders([]);
          setError(err instanceof Error ? err.message : 'Không thể tải cấu hình SSO.');
        }
      })
      .finally(() => {
        if (active) setLoadingProviders(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen]);

  const handleValidateDomain = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) {
      setError('Vui lòng nhập email doanh nghiệp.');
      return;
    }

    setValidatingDomain(true);
    setDomainValidation(null);
    setError(null);
    try {
      const result = await meetingApi.validateEnterpriseDomain(email);
      setDomainValidation(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể xác minh domain doanh nghiệp.');
    } finally {
      setValidatingDomain(false);
    }
  };

  const handleProviderLogin = (provider: SsoProvider) => {
    if (!domainValidation?.allowed || !provider.enabled || !provider.authUrl) return;
    window.location.assign(provider.authUrl);
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="enterprise-sso-title"
      className="m-auto w-[calc(100%-2rem)] max-w-lg overflow-hidden rounded-2xl border border-zinc-200 bg-white p-0 text-zinc-900 shadow-2xl backdrop:bg-black/65 backdrop:backdrop-blur-sm dark:border-zinc-700 dark:bg-[#18181b] dark:text-zinc-100"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="border-b border-zinc-200 bg-zinc-50 px-5 py-4 dark:border-zinc-800 dark:bg-[#121214]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-400">
              <Building2 className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="enterprise-sso-title" className="text-base font-bold">
                Enterprise SSO
              </h2>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                Đăng nhập bằng tài khoản Google Workspace hoặc Microsoft 365 của công ty.
              </p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-200 hover:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            aria-label="Đóng đăng nhập Enterprise SSO"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="space-y-5 px-5 py-5">
        <form onSubmit={handleValidateDomain} className="space-y-2">
          <label htmlFor="enterprise-email" className="block text-xs font-semibold">
            Email doanh nghiệp
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" aria-hidden="true" />
              <input
                id="enterprise-email"
                type="email"
                autoComplete="email"
                maxLength={254}
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setDomainValidation(null);
                }}
                placeholder="ban@congty.com"
                className="w-full rounded-lg border border-zinc-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>
            <button
              type="submit"
              disabled={validatingDomain}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
            >
              {validatingDomain && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
              Xác minh domain
            </button>
          </div>
        </form>

        <div aria-live="polite" className="min-h-5">
          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}
          {domainValidation?.allowed && (
            <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                Domain <strong>{domainValidation.domain}</strong> đã được chấp nhận
                {domainValidation.organizationName ? ` cho ${domainValidation.organizationName}` : ''}.
              </span>
            </div>
          )}
          {domainValidation && !domainValidation.allowed && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
              <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Domain này chưa được quản trị viên LayaMeet cho phép.</span>
            </div>
          )}
        </div>

        <div className="space-y-2" aria-busy={loadingProviders}>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Nhà cung cấp danh tính
          </div>
          {loadingProviders ? (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-zinc-200 py-7 text-xs text-zinc-500 dark:border-zinc-800">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Đang tải cấu hình SSO...
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {providers.map((provider) => {
                const canSignIn = Boolean(
                  domainValidation?.allowed && provider.enabled && provider.authUrl,
                );
                const status = !provider.enabled
                  ? 'Chưa cấu hình'
                  : domainValidation?.allowed
                    ? 'Tiếp tục đăng nhập'
                    : 'Xác minh email trước';

                return (
                  <button
                    key={provider.id}
                    type="button"
                    disabled={!canSignIn}
                    onClick={() => handleProviderLogin(provider)}
                    className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 text-left transition-colors hover:border-blue-400 hover:bg-blue-50/60 disabled:cursor-not-allowed disabled:opacity-55 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-blue-700 dark:hover:bg-blue-950/20"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white dark:border-zinc-700">
                      <ProviderIcon provider={provider} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-semibold">{provider.name}</span>
                      <span className="mt-0.5 block text-[11px] text-zinc-500 dark:text-zinc-400">
                        {status}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <p className="text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
          LayaMeet chỉ dùng email để kiểm tra chính sách domain. Việc xác thực tài khoản được thực hiện bởi nhà cung cấp SSO của doanh nghiệp.
        </p>
      </div>
    </dialog>
  );
};
