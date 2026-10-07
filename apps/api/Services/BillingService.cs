using System.Collections.Concurrent;
using System.Net.Mail;
using AITranslateMeeting.Api.DTOs;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace AITranslateMeeting.Api.Services;

public interface IBillingService
{
    PaymentOrderResponse CreateOrder(CreatePaymentOrderRequest request);
    PaymentOrderResponse? GetOrder(string orderCode);
    Task<PaymentOrderResponse?> MarkOrderPaidAsync(string orderCode, CancellationToken cancellationToken = default);
    Task<PaymentOrderResponse?> ProcessPayOsWebhookAsync(PayOsWebhookPayload payload, CancellationToken cancellationToken = default);
    Task<PaymentOrderResponse?> ProcessPolarWebhookAsync(PolarWebhookPayload payload, string? signature = null, CancellationToken cancellationToken = default);
    IReadOnlyList<PaymentOrderResponse> GetAllOrders();
    BillingMetricsDto GetMetrics();
    IReadOnlyList<PlanInfoDto> GetAvailablePlans();
    AccountSubscriptionDto GetAccountSubscription(string email);
}

public sealed class BillingService : IBillingService
{
    private static readonly ConcurrentDictionary<string, PaymentOrderResponse> Orders =
        new(StringComparer.OrdinalIgnoreCase);

    private readonly INotificationDispatcher _notificationDispatcher;
    private readonly ILogger<BillingService> _logger;
    private readonly string _bankId;
    private readonly string _accountNumber;
    private readonly string _accountName;
    private readonly string _payOsClientId;
    private readonly string _payOsApiKey;
    private readonly string _payOsChecksumKey;
    private readonly string _polarAccessToken;
    private readonly string _polarWebhookSecret;

    private static readonly IReadOnlyList<PlanInfoDto> Plans =
    [
        new("pro", "Gói LayaMeet Pro 1 Tháng", 99_000, "1 tháng không giới hạn",
            [
                "Không giới hạn thời lượng mọi cuộc họp",
                "Không giới hạn số phút dịch thuật AI đa chiều (TTFS <350ms)",
                "Laya AI tự động trích xuất Action Items & Decisions",
                "Xuất biên bản họp tự động (Markdown / Word / PDF)",
                "Xóa watermark thương hiệu & Hỗ trợ ưu tiên 24/7"
            ],
            PriceUsd: 4.99m),
        new("pro_annual", "Gói LayaMeet Pro 1 Năm (Tiết kiệm 20%)", 948_000, "12 tháng không giới hạn",
            [
                "Không giới hạn thời lượng mọi cuộc họp",
                "Không giới hạn số phút dịch thuật AI đa chiều (TTFS <350ms)",
                "Laya AI tự động trích xuất Action Items & Decisions",
                "Xuất biên bản họp tự động (Markdown / Word / PDF)",
                "Xóa watermark thương hiệu & Hỗ trợ ưu tiên 24/7"
            ],
            PriceUsd: 47.88m),
        new("pro_2year", "Gói LayaMeet Pro 2 Năm (Tiết kiệm 35%)", 1_544_000, "24 tháng không giới hạn",
            [
                "Không giới hạn thời lượng mọi cuộc họp",
                "Không giới hạn số phút dịch thuật AI đa chiều (TTFS <350ms)",
                "Laya AI tự động trích xuất Action Items & Decisions",
                "Xuất biên bản họp tự động (Markdown / Word / PDF)",
                "Xóa watermark thương hiệu & Hỗ trợ ưu tiên 24/7"
            ],
            PriceUsd: 78.00m)
    ];

    public BillingService(
        IConfiguration configuration,
        INotificationDispatcher notificationDispatcher,
        ILogger<BillingService> logger)
    {
        _notificationDispatcher = notificationDispatcher;
        _logger = logger;
        _bankId = configuration["Billing:BankId"] ?? "MB";
        _accountNumber = configuration["Billing:AccountNumber"] ?? "0901234567";
        _accountName = configuration["Billing:AccountName"] ?? "CONG TY LAYAMEET";
        _payOsClientId = configuration["Billing:PayOS:ClientId"] ?? configuration["PayOS:ClientId"] ?? "";
        _payOsApiKey = configuration["Billing:PayOS:ApiKey"] ?? configuration["PayOS:ApiKey"] ?? "";
        _payOsChecksumKey = configuration["Billing:PayOS:ChecksumKey"] ?? configuration["PayOS:ChecksumKey"] ?? "";
        _polarAccessToken = configuration["Billing:Polar:AccessToken"] ?? configuration["Polar:AccessToken"] ?? "";
        _polarWebhookSecret = configuration["Billing:Polar:WebhookSecret"] ?? configuration["Polar:WebhookSecret"] ?? "";
    }

    public IReadOnlyList<PlanInfoDto> GetAvailablePlans() => Plans;

    public PaymentOrderResponse CreateOrder(CreatePaymentOrderRequest request)
    {
        if (!TryNormalizeCustomerEmail(request.CustomerEmail, out var customerEmail))
        {
            throw new ArgumentException(
                "A valid logged-in account email (CustomerEmail) is required to create a billing order.",
                nameof(request.CustomerEmail));
        }

        if (!TryResolvePlan(request.PlanId, out var plan))
        {
            throw new ArgumentException($"Plan '{request.PlanId}' is not valid.");
        }

        var isPolar = string.Equals(request.PaymentMethod, "polar", StringComparison.OrdinalIgnoreCase) ||
                      string.Equals(request.Currency, "USD", StringComparison.OrdinalIgnoreCase);
        var paymentMethod = isPolar ? "polar" : "vietqr";
        var currency = isPolar ? "USD" : "VND";
        var amountUsd = isPolar ? plan.PriceUsd : (decimal?)null;

        PaymentOrderResponse order;
        do
        {
            var prefix = isPolar ? "PL" : "VM";
            var orderCode = $"{prefix}{Guid.NewGuid():N}"[..14].ToUpperInvariant();
            var qrUrl = isPolar ? string.Empty : BuildQrUrl(orderCode, plan.PriceVnd);
            var checkoutUrl = isPolar
                ? (!string.IsNullOrEmpty(_polarAccessToken)
                    ? $"https://buy.polar.sh/checkout/{orderCode}"
                    : $"https://sandbox.polar.sh/checkout/{orderCode}")
                : (!string.IsNullOrEmpty(_payOsClientId)
                    ? $"https://pay.payos.vn/web/{orderCode}"
                    : null);

            order = new PaymentOrderResponse(
                orderCode,
                plan.PriceVnd,
                plan.Name,
                "pending",
                qrUrl,
                isPolar ? "POLAR" : _bankId,
                isPolar ? "CARD/APPLE_PAY" : _accountNumber,
                isPolar ? "Polar Merchant of Record" : _accountName,
                DateTime.UtcNow,
                CustomerEmail: customerEmail,
                CustomerName: NormalizeOptionalValue(request.CustomerName),
                UserId: NormalizeOptionalValue(request.UserId),
                PlanId: plan.PlanId,
                PaymentMethod: paymentMethod,
                Currency: currency,
                AmountUsd: amountUsd,
                CheckoutUrl: checkoutUrl);
        }
        while (!Orders.TryAdd(order.OrderCode, order));

        _logger.LogInformation("Created payment order {OrderCode} ({Method}/{Currency}) for {Plan} ({Amount} VND / {AmountUsd} USD)",
            order.OrderCode, paymentMethod, currency, plan.Name, plan.PriceVnd, amountUsd);
        return order;
    }

    public PaymentOrderResponse? GetOrder(string orderCode)
    {
        return Orders.TryGetValue(orderCode, out var order) ? order : null;
    }

    public async Task<PaymentOrderResponse?> ProcessPayOsWebhookAsync(PayOsWebhookPayload payload, CancellationToken cancellationToken = default)
    {
        if (payload.Data == null || !string.Equals(payload.Code, "00", StringComparison.OrdinalIgnoreCase))
        {
            _logger.LogWarning("PayOS webhook rejected: code {Code}, desc {Desc}", payload.Code, payload.Desc);
            return null;
        }

        var orderCodeStr = payload.Data.OrderCode.ToString();
        var targetOrder = Orders.Values.FirstOrDefault(o =>
            string.Equals(o.OrderCode, orderCodeStr, StringComparison.OrdinalIgnoreCase) ||
            o.OrderCode.EndsWith(orderCodeStr, StringComparison.OrdinalIgnoreCase) ||
            (payload.Data.Description != null && payload.Data.Description.Contains(o.OrderCode, StringComparison.OrdinalIgnoreCase)));

        if (targetOrder == null)
        {
            _logger.LogWarning("PayOS webhook: no matching order found for code {OrderCode}", payload.Data.OrderCode);
            return null;
        }

        if (!string.IsNullOrEmpty(_payOsChecksumKey) && !string.IsNullOrEmpty(payload.Signature))
        {
            var dataToSign = $"amount={payload.Data.Amount}&cancelUrl=&description={payload.Data.Description}&orderCode={payload.Data.OrderCode}&returnUrl=";
            // Validate signature if non-empty
            if (!VerifyHmacSha256(dataToSign, _payOsChecksumKey, payload.Signature))
            {
                _logger.LogWarning("PayOS webhook signature mismatch for order {OrderCode}", targetOrder.OrderCode);
            }
        }

        return await MarkOrderPaidAsync(targetOrder.OrderCode, cancellationToken);
    }

    public async Task<PaymentOrderResponse?> ProcessPolarWebhookAsync(PolarWebhookPayload payload, string? signature = null, CancellationToken cancellationToken = default)
    {
        var metadata = payload.Data?.Metadata;
        string? orderCode = null;
        if (metadata != null && metadata.TryGetValue("order_code", out var code))
        {
            orderCode = code;
        }
        else if (payload.Data?.Id != null)
        {
            orderCode = payload.Data.Id;
        }

        if (string.IsNullOrEmpty(orderCode))
        {
            _logger.LogWarning("Polar webhook: no order_code found in payload metadata or id");
            return null;
        }

        var targetOrder = Orders.Values.FirstOrDefault(o =>
            string.Equals(o.OrderCode, orderCode, StringComparison.OrdinalIgnoreCase));

        if (targetOrder == null)
        {
            _logger.LogWarning("Polar webhook: order {OrderCode} not found in database", orderCode);
            return null;
        }

        return await MarkOrderPaidAsync(targetOrder.OrderCode, cancellationToken);
    }

    public static bool VerifyHmacSha256(string data, string key, string signature)
    {
        try
        {
            using var hmac = new System.Security.Cryptography.HMACSHA256(System.Text.Encoding.UTF8.GetBytes(key));
            var hash = hmac.ComputeHash(System.Text.Encoding.UTF8.GetBytes(data));
            var computedHex = Convert.ToHexString(hash).ToLowerInvariant();
            return string.Equals(computedHex, signature.Trim().ToLowerInvariant(), StringComparison.OrdinalIgnoreCase);
        }
        catch
        {
            return false;
        }
    }

    public async Task<PaymentOrderResponse?> MarkOrderPaidAsync(string orderCode, CancellationToken cancellationToken = default)
    {
        if (!Orders.TryGetValue(orderCode, out var order))
        {
            return null;
        }

        var paidAt = DateTime.UtcNow;
        var paidOrder = order with
        {
            Status = "paid",
            PaidAt = paidAt,
            SubscriptionExpiresAt = paidAt.AddDays(
                (order.PlanId == "pro_2year" || order.PlanId == "pro_biennial" || order.PlanId == "2year") ? 730 :
                (order.PlanId == "pro_annual" ? 365 : 30))
        };
        Orders[order.OrderCode] = paidOrder;

        _logger.LogInformation("Order {OrderCode} marked as PAID", orderCode);

        // Dispatch notification
        await _notificationDispatcher.DispatchPaymentSuccessAsync(paidOrder, cancellationToken);
        return paidOrder;
    }

    public IReadOnlyList<PaymentOrderResponse> GetAllOrders()
    {
        return Orders.Values.OrderByDescending(o => o.CreatedAt).ToList();
    }

    public BillingMetricsDto GetMetrics()
    {
        var all = Orders.Values.ToList();
        var paid = all.Where(o => string.Equals(o.Status, "paid", StringComparison.OrdinalIgnoreCase)).ToList();
        var pending = all.Where(o => string.Equals(o.Status, "pending", StringComparison.OrdinalIgnoreCase)).ToList();
        var totalRev = paid.Sum(o => (long)o.Amount);

        return new BillingMetricsDto(
            TotalOrders: all.Count,
            PaidOrders: paid.Count,
            PendingOrders: pending.Count,
            TotalRevenueVnd: totalRev,
            RecentOrders: all.OrderByDescending(o => o.CreatedAt).Take(20).ToList()
        );
    }

    public AccountSubscriptionDto GetAccountSubscription(string email)
    {
        if (!TryNormalizeCustomerEmail(email, out var normalizedEmail))
        {
            throw new ArgumentException("A valid account email is required.", nameof(email));
        }

        var now = DateTime.UtcNow;
        var paidOrder = Orders.Values
            .Where(order =>
                string.Equals(order.Status, "paid", StringComparison.OrdinalIgnoreCase) &&
                string.Equals(order.CustomerEmail, normalizedEmail, StringComparison.OrdinalIgnoreCase) &&
                (order.SubscriptionExpiresAt == null || order.SubscriptionExpiresAt > now))
            .OrderByDescending(order => order.PaidAt ?? order.CreatedAt)
            .FirstOrDefault();

        return paidOrder == null
            ? new AccountSubscriptionDto(normalizedEmail, "free", false, null, null, null, null, null)
            : new AccountSubscriptionDto(
                normalizedEmail,
                "pro",
                true,
                paidOrder.PlanId,
                paidOrder.PlanName,
                paidOrder.OrderCode,
                paidOrder.PaidAt ?? paidOrder.CreatedAt,
                paidOrder.SubscriptionExpiresAt);
    }

    public static bool TryResolvePlan(string? planId, out PlanInfoDto plan)
    {
        var normalized = planId?.Trim().ToLowerInvariant();
        var found = Plans.FirstOrDefault(p =>
            string.Equals(p.PlanId, normalized, StringComparison.OrdinalIgnoreCase) ||
            ((normalized == "pro_monthly" || normalized == "monthly") && p.PlanId == "pro") ||
            (normalized == "annual" && p.PlanId == "pro_annual") ||
            ((normalized == "2year" || normalized == "pro_biennial" || normalized == "biennial") && p.PlanId == "pro_2year"));

        if (found != null)
        {
            plan = found;
            return true;
        }

        plan = null!;
        return false;
    }

    public static bool TryNormalizeCustomerEmail(string? email, out string normalizedEmail)
    {
        normalizedEmail = string.Empty;
        if (string.IsNullOrWhiteSpace(email))
        {
            return false;
        }

        var candidate = email.Trim();
        if (!MailAddress.TryCreate(candidate, out var parsed) ||
            !string.Equals(parsed.Address, candidate, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        normalizedEmail = parsed.Address.ToLowerInvariant();
        return true;
    }

    private static string? NormalizeOptionalValue(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private string BuildQrUrl(string orderCode, int amount)
    {
        return $"https://img.vietqr.io/image/{Uri.EscapeDataString(_bankId)}-{Uri.EscapeDataString(_accountNumber)}-compact2.png" +
               $"?amount={amount}&addInfo={Uri.EscapeDataString(orderCode)}&accountName={Uri.EscapeDataString(_accountName)}";
    }
}
