using AITranslateMeeting.Api.Data;
using AITranslateMeeting.Api.DTOs;
using AITranslateMeeting.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AITranslateMeeting.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class AdminController : ControllerBase
{
    private readonly IBillingService _billingService;
    private readonly ILeadService _leadService;
    private readonly INotificationDispatcher _notificationDispatcher;
    private readonly AppDbContext _dbContext;
    private readonly string _adminSecretKey;

    public AdminController(
        IBillingService billingService,
        ILeadService leadService,
        INotificationDispatcher notificationDispatcher,
        AppDbContext dbContext,
        IConfiguration configuration)
    {
        _billingService = billingService;
        _leadService = leadService;
        _notificationDispatcher = notificationDispatcher;
        _dbContext = dbContext;
        _adminSecretKey = configuration["Admin:SecretKey"] ?? "vimeet-admin-secret-2026";
    }

    private bool IsAuthorized()
    {
        if (Request.Headers.TryGetValue("X-Admin-Key", out var headerKey) &&
            string.Equals(headerKey.ToString().Trim(), _adminSecretKey, StringComparison.Ordinal))
        {
            return true;
        }

        if (Request.Query.TryGetValue("key", out var queryKey) &&
            string.Equals(queryKey.ToString().Trim(), _adminSecretKey, StringComparison.Ordinal))
        {
            return true;
        }

        return false;
    }

    private ActionResult UnauthorizedResult()
    {
        return StatusCode(StatusCodes.Status401Unauthorized, new ProblemDetails
        {
            Title = "Unauthorized",
            Detail = "Invalid or missing X-Admin-Key header.",
            Status = StatusCodes.Status401Unauthorized
        });
    }

    [HttpGet("metrics")]
    [ProducesResponseType(typeof(AdminMetricsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<AdminMetricsResponse>> GetMetricsAsync(CancellationToken cancellationToken)
    {
        if (!IsAuthorized())
        {
            return UnauthorizedResult();
        }

        var activeMeetings = 0;
        try
        {
            activeMeetings = await _dbContext.Meetings.CountAsync(m => m.EndedAt == null, cancellationToken);
        }
        catch
        {
            // In-memory or fallback
        }

        var billingMetrics = _billingService.GetMetrics();
        var totalLeads = _leadService.GetLeadCount();

        return Ok(new AdminMetricsResponse(
            ActiveMeetings: activeMeetings,
            TotalOrders: billingMetrics.TotalOrders,
            PaidOrders: billingMetrics.PaidOrders,
            TotalRevenueVnd: billingMetrics.TotalRevenueVnd,
            TotalLeads: totalLeads,
            TelegramConfigured: _notificationDispatcher.IsTelegramConfigured,
            WebhookConfigured: _notificationDispatcher.IsWebhookConfigured,
            GeneratedAtUtc: DateTime.UtcNow
        ));
    }

    [HttpGet("orders")]
    [ProducesResponseType(typeof(IReadOnlyList<PaymentOrderResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    public ActionResult<IReadOnlyList<PaymentOrderResponse>> GetOrders()
    {
        if (!IsAuthorized())
        {
            return UnauthorizedResult();
        }

        return Ok(_billingService.GetAllOrders());
    }

    [HttpGet("leads")]
    [ProducesResponseType(typeof(IReadOnlyList<EnterpriseLeadRecord>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    public ActionResult<IReadOnlyList<EnterpriseLeadRecord>> GetLeads()
    {
        if (!IsAuthorized())
        {
            return UnauthorizedResult();
        }

        return Ok(_leadService.GetAllLeads());
    }

    [HttpPost("test-notification")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult> TestNotificationAsync(CancellationToken cancellationToken)
    {
        if (!IsAuthorized())
        {
            return UnauthorizedResult();
        }

        var success = await _notificationDispatcher.SendTestNotificationAsync(
            "Đây là thông báo kiểm tra hệ thống từ trang quản trị ViMeet Admin Dashboard.",
            cancellationToken);

        return Ok(new
        {
            success,
            message = success
                ? "Đã gửi thông báo thử nghiệm thành công tới kênh Telegram / Webhook."
                : "Chưa cấu hình Telegram/Webhook hoặc kênh không phản hồi. Vui lòng kiểm tra lại cấu hình."
        });
    }
}
