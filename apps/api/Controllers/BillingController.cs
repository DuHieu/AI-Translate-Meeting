using AITranslateMeeting.Api.DTOs;
using AITranslateMeeting.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;

namespace AITranslateMeeting.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class BillingController : ControllerBase
{
    private readonly IBillingService _billingService;

    public BillingController(IConfiguration configuration)
        : this(new BillingService(
            configuration,
            new NotificationDispatcher(configuration, NullLogger<NotificationDispatcher>.Instance),
            NullLogger<BillingService>.Instance))
    {
    }

    public BillingController(IBillingService billingService)
    {
        _billingService = billingService;
    }

    [HttpGet("plans")]
    [ProducesResponseType(typeof(IReadOnlyList<PlanInfoDto>), StatusCodes.Status200OK)]
    public ActionResult<IReadOnlyList<PlanInfoDto>> GetPlans()
    {
        return Ok(_billingService.GetAvailablePlans());
    }

    [HttpPost("create-order")]
    [ProducesResponseType(typeof(PaymentOrderResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public ActionResult<PaymentOrderResponse> CreateOrder(
        [FromBody] CreatePaymentOrderRequest request)
    {
        if (!BillingService.TryResolvePlan(request.PlanId, out _))
        {
            return Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: "Invalid payment plan",
                detail: "PlanId must be 'pro' (Gói LayaMeet Pro 1 Tháng).");
        }

        try
        {
            var order = _billingService.CreateOrder(request);
            return Ok(order);
        }
        catch (ArgumentException ex)
        {
            return Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: "Invalid payment plan",
                detail: ex.Message);
        }
    }

    [HttpGet("order/{orderCode}")]
    [ProducesResponseType(typeof(PaymentOrderResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public ActionResult<PaymentOrderResponse> GetOrder([FromRoute] string orderCode)
    {
        var order = _billingService.GetOrder(orderCode);
        if (order == null)
        {
            return OrderNotFound(orderCode);
        }

        return Ok(order);
    }

    [HttpPost("webhook")]
    [ProducesResponseType(typeof(PaymentOrderResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PaymentOrderResponse>> Webhook(
        [FromBody] PaymentWebhookPayload payload,
        CancellationToken cancellationToken = default)
    {
        var paidOrder = await _billingService.MarkOrderPaidAsync(payload.OrderCode, cancellationToken);
        if (paidOrder == null)
        {
            return OrderNotFound(payload.OrderCode);
        }

        return Ok(paidOrder);
    }

    private ObjectResult OrderNotFound(string orderCode)
    {
        return Problem(
            statusCode: StatusCodes.Status404NotFound,
            title: "Payment order not found",
            detail: $"Payment order '{orderCode}' was not found.");
    }
}
