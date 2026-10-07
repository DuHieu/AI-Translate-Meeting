namespace AITranslateMeeting.Api.DTOs;

public sealed record CreatePaymentOrderRequest(
    string PlanId,
    string? MeetingCode = null,
    string? CustomerEmail = null,
    string? CustomerName = null,
    string? UserId = null,
    string? PaymentMethod = "vietqr",
    string? Currency = "VND"
);

public sealed record PaymentOrderResponse(
    string OrderCode,
    int Amount,
    string PlanName,
    string Status,
    string QrUrl,
    string BankId,
    string AccountNumber,
    string AccountName,
    DateTime CreatedAt,
    string? CustomerEmail = null,
    string? CustomerName = null,
    string? UserId = null,
    string PlanId = "pro",
    DateTime? PaidAt = null,
    DateTime? SubscriptionExpiresAt = null,
    string PaymentMethod = "vietqr",
    string Currency = "VND",
    decimal? AmountUsd = null,
    string? CheckoutUrl = null
);

public sealed record AccountSubscriptionDto(
    string Email,
    string Tier,
    bool IsPro,
    string? ActivePlanId,
    string? ActivePlanName,
    string? LastOrderCode,
    DateTime? ActivatedAt,
    DateTime? ExpiresAt
);

public sealed record PaymentWebhookPayload(
    string OrderCode,
    int Amount,
    string Status,
    string? Signature
);

public sealed record PayOsWebhookData(
    long OrderCode,
    int Amount,
    string? Description = null,
    string? Reference = null,
    string? TransactionDateTime = null,
    string? Currency = "VND",
    string? PaymentLinkId = null,
    string? Code = "00",
    string? Desc = "success"
);

public sealed record PayOsWebhookPayload(
    string Code,
    string Desc,
    PayOsWebhookData? Data,
    string? Signature
);

public sealed record PolarWebhookData(
    string? Id,
    string? Status,
    int? Amount,
    string? Currency,
    Dictionary<string, string>? Metadata
);

public sealed record PolarWebhookPayload(
    string Type,
    PolarWebhookData? Data
);

public sealed record BillingMetricsDto(
    int TotalOrders,
    int PaidOrders,
    int PendingOrders,
    long TotalRevenueVnd,
    IReadOnlyList<PaymentOrderResponse> RecentOrders
);

public sealed record PlanInfoDto(
    string PlanId,
    string Name,
    int PriceVnd,
    string DurationDescription,
    string[] Features,
    decimal PriceUsd = 4.99m
);
