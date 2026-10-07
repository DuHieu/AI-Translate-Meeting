using AITranslateMeeting.Api.DTOs;
using AITranslateMeeting.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
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

    [ActivatorUtilitiesConstructor]
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
        if (!BillingService.TryNormalizeCustomerEmail(request.CustomerEmail, out _))
        {
            return AccountLoginRequired();
        }

        if (!BillingService.TryResolvePlan(request.PlanId, out _))
        {
            return Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: "Invalid payment plan",
                detail: "PlanId must be 'pro' or 'pro_annual'.");
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

    [HttpGet("subscription")]
    [ProducesResponseType(typeof(AccountSubscriptionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public ActionResult<AccountSubscriptionDto> GetSubscription([FromQuery] string? email)
    {
        if (!BillingService.TryNormalizeCustomerEmail(email, out _))
        {
            return AccountLoginRequired();
        }

        return Ok(_billingService.GetAccountSubscription(email!));
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

    [HttpPost("webhook/payos")]
    [ProducesResponseType(typeof(PaymentOrderResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PaymentOrderResponse>> PayOsWebhook(
        [FromBody] PayOsWebhookPayload payload,
        CancellationToken cancellationToken = default)
    {
        var paidOrder = await _billingService.ProcessPayOsWebhookAsync(payload, cancellationToken);
        if (paidOrder == null)
        {
            return Problem(
                statusCode: StatusCodes.Status404NotFound,
                title: "PayOS payment order not found or invalid",
                detail: $"PayOS webhook could not match or process order code '{payload.Data?.OrderCode}'.");
        }

        return Ok(paidOrder);
    }

    [HttpPost("webhook/polar")]
    [ProducesResponseType(typeof(PaymentOrderResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PaymentOrderResponse>> PolarWebhook(
        [FromBody] PolarWebhookPayload payload,
        [FromHeader(Name = "webhook-signature")] string? signature = null,
        CancellationToken cancellationToken = default)
    {
        var paidOrder = await _billingService.ProcessPolarWebhookAsync(payload, signature, cancellationToken);
        if (paidOrder == null)
        {
            return Problem(
                statusCode: StatusCodes.Status404NotFound,
                title: "Polar payment order not found",
                detail: "Polar webhook could not match any active order.");
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

    private ObjectResult AccountLoginRequired()
    {
        return Problem(
            statusCode: StatusCodes.Status400BadRequest,
            title: "Account login required",
            detail: "You must sign in with your account (CustomerEmail) before creating a billing order.");
    }
}
