using System.Collections.Concurrent;
using AITranslateMeeting.Api.DTOs;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace AITranslateMeeting.Api.Services;

public interface IBillingService
{
    PaymentOrderResponse CreateOrder(CreatePaymentOrderRequest request);
    PaymentOrderResponse? GetOrder(string orderCode);
    Task<PaymentOrderResponse?> MarkOrderPaidAsync(string orderCode, CancellationToken cancellationToken = default);
    IReadOnlyList<PaymentOrderResponse> GetAllOrders();
    BillingMetricsDto GetMetrics();
    IReadOnlyList<PlanInfoDto> GetAvailablePlans();
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

    private static readonly IReadOnlyList<PlanInfoDto> Plans =
    [
        new("pro", "Gói Team Pro 1 Tháng", 499_000, "1 tháng không giới hạn",
            ["Không giới hạn thời lượng họp", "Dịch thuật ma trận đa chiều TTFS <350ms", "Laya AI Action Items & Decisions", "Xuất biên bản họp tự động", "Redis Cache phân tán"]),
        new("pass", "Vé Họp Không Giới Hạn 24h", 99_000, "24 giờ sử dụng liên tục",
            ["Không giới hạn thời lượng trong 24h", "Dịch thời gian thực tiếng Việt / Anh / Nhật", "AI Action Items", "Dành cho hội thảo & workshop"]),
        new("pass_1h", "Vé 1 Giờ Họp Pro", 39_000, "1 giờ họp cấp tốc",
            ["Gỡ bỏ giới hạn 40 phút ngay lập tức", "Dịch phụ đề song ngữ chuẩn xác", "Kích hoạt tức thì qua VietQR"]),
        new("credits_500m", "Gói 500 Phút Dịch Thuật AI", 199_000, "500 phút dùng linh hoạt",
            ["Trừ theo số phút nói thực tế", "Hạn dùng 1 năm", "Không lãng phí khi họp ít", "Hỗ trợ dịch bất kỳ ngôn ngữ nào"])
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
        _accountName = configuration["Billing:AccountName"] ?? "CONG TY VIMEET";
    }

    public IReadOnlyList<PlanInfoDto> GetAvailablePlans() => Plans;

    public PaymentOrderResponse CreateOrder(CreatePaymentOrderRequest request)
    {
        if (!TryResolvePlan(request.PlanId, out var plan))
        {
            throw new ArgumentException($"Plan '{request.PlanId}' is not valid.");
        }

        PaymentOrderResponse order;
        do
        {
            var orderCode = $"VM{Guid.NewGuid():N}"[..14].ToUpperInvariant();
            var qrUrl = BuildQrUrl(orderCode, plan.PriceVnd);
            order = new PaymentOrderResponse(
                orderCode,
                plan.PriceVnd,
                plan.Name,
                "pending",
                qrUrl,
                _bankId,
                _accountNumber,
                _accountName,
                DateTime.UtcNow);
        }
        while (!Orders.TryAdd(order.OrderCode, order));

        _logger.LogInformation("Created payment order {OrderCode} for {Plan} ({Amount} VND)", order.OrderCode, plan.Name, plan.PriceVnd);
        return order;
    }

    public PaymentOrderResponse? GetOrder(string orderCode)
    {
        return Orders.TryGetValue(orderCode, out var order) ? order : null;
    }

    public async Task<PaymentOrderResponse?> MarkOrderPaidAsync(string orderCode, CancellationToken cancellationToken = default)
    {
        if (!Orders.TryGetValue(orderCode, out var order))
        {
            return null;
        }

        var paidOrder = order with { Status = "paid" };
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

    public static bool TryResolvePlan(string? planId, out PlanInfoDto plan)
    {
        var normalized = planId?.Trim().ToLowerInvariant();
        var found = Plans.FirstOrDefault(p =>
            string.Equals(p.PlanId, normalized, StringComparison.OrdinalIgnoreCase) ||
            (normalized == "pro_monthly" && p.PlanId == "pro") ||
            (normalized == "pass_24h" && p.PlanId == "pass"));

        if (found != null)
        {
            plan = found;
            return true;
        }

        plan = null!;
        return false;
    }

    private string BuildQrUrl(string orderCode, int amount)
    {
        return $"https://img.vietqr.io/image/{Uri.EscapeDataString(_bankId)}-{Uri.EscapeDataString(_accountNumber)}-compact2.png" +
               $"?amount={amount}&addInfo={Uri.EscapeDataString(orderCode)}&accountName={Uri.EscapeDataString(_accountName)}";
    }
}
