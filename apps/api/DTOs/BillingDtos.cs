namespace AITranslateMeeting.Api.DTOs;

public sealed record CreatePaymentOrderRequest(
    string PlanId,
    string? MeetingCode,
    string? CustomerEmail,
    string? CustomerName
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
    DateTime CreatedAt
);

public sealed record PaymentWebhookPayload(
    string OrderCode,
    int Amount,
    string Status,
    string? Signature
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
    string[] Features
);
