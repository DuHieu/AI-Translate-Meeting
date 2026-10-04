using System.Collections.Concurrent;
using AITranslateMeeting.Api.DTOs;
using Microsoft.AspNetCore.Mvc;

namespace AITranslateMeeting.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class BillingController : ControllerBase
{
    private static readonly ConcurrentDictionary<string, PaymentOrderResponse> Orders =
        new(StringComparer.OrdinalIgnoreCase);

    private readonly string _bankId;
    private readonly string _accountNumber;
    private readonly string _accountName;

    public BillingController(IConfiguration configuration)
    {
        _bankId = ReadConfiguration(configuration, "Billing:BankId", "MB");
        _accountNumber = ReadConfiguration(configuration, "Billing:AccountNumber", "0901234567");
        _accountName = ReadConfiguration(configuration, "Billing:AccountName", "CONG TY VIMEET");
    }

    [HttpPost("create-order")]
    [ProducesResponseType(typeof(PaymentOrderResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public ActionResult<PaymentOrderResponse> CreateOrder(
        [FromBody] CreatePaymentOrderRequest request)
    {
        if (!TryGetPlan(request.PlanId, out var amount, out var planName))
        {
            return Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: "Invalid payment plan",
                detail: "PlanId must be either 'pro' or 'pass'.");
        }

        PaymentOrderResponse order;
        do
        {
            var orderCode = $"VM{Guid.NewGuid():N}"[..14].ToUpperInvariant();
            var qrUrl = BuildQrUrl(orderCode, amount);
            order = new PaymentOrderResponse(
                orderCode,
                amount,
                planName,
                "pending",
                qrUrl,
                _bankId,
                _accountNumber,
                _accountName,
                DateTime.UtcNow);
        }
        while (!Orders.TryAdd(order.OrderCode, order));

        return Ok(order);
    }

    [HttpGet("order/{orderCode}")]
    [ProducesResponseType(typeof(PaymentOrderResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public ActionResult<PaymentOrderResponse> GetOrder([FromRoute] string orderCode)
    {
        if (!Orders.TryGetValue(orderCode, out var order))
        {
            return OrderNotFound(orderCode);
        }

        return Ok(order);
    }

    [HttpPost("webhook")]
    [ProducesResponseType(typeof(PaymentOrderResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public ActionResult<PaymentOrderResponse> Webhook(
        [FromBody] PaymentWebhookPayload payload)
    {
        if (!Orders.TryGetValue(payload.OrderCode, out var order))
        {
            return OrderNotFound(payload.OrderCode);
        }

        var paidOrder = order with { Status = "paid" };
        Orders[order.OrderCode] = paidOrder;
        return Ok(paidOrder);
    }

    private string BuildQrUrl(string orderCode, int amount)
    {
        return $"https://img.vietqr.io/image/{Uri.EscapeDataString(_bankId)}-{Uri.EscapeDataString(_accountNumber)}-compact2.png" +
               $"?amount={amount}&addInfo={Uri.EscapeDataString(orderCode)}&accountName={Uri.EscapeDataString(_accountName)}";
    }

    private ObjectResult OrderNotFound(string orderCode)
    {
        return Problem(
            statusCode: StatusCodes.Status404NotFound,
            title: "Payment order not found",
            detail: $"Payment order '{orderCode}' was not found.");
    }

    private static string ReadConfiguration(
        IConfiguration configuration,
        string key,
        string defaultValue)
    {
        var value = configuration[key];
        return string.IsNullOrWhiteSpace(value) ? defaultValue : value.Trim();
    }

    private static bool TryGetPlan(string? planId, out int amount, out string planName)
    {
        switch (planId?.Trim().ToLowerInvariant())
        {
            case "pro":
                amount = 499_000;
                planName = "Gói Team Pro 1 Tháng";
                return true;
            case "pass":
                amount = 99_000;
                planName = "Vé Họp Không Giới Hạn 24h";
                return true;
            default:
                amount = 0;
                planName = string.Empty;
                return false;
        }
    }
}
