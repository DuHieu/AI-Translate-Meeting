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
    private readonly IInfraMetricsService _infraMetricsService;
    private readonly AppDbContext _dbContext;
    private readonly string _adminSecretKey;

    public AdminController(
        IBillingService billingService,
        ILeadService leadService,
        INotificationDispatcher notificationDispatcher,
        IInfraMetricsService infraMetricsService,
        AppDbContext dbContext,
        IConfiguration configuration)
    {
        _billingService = billingService;
        _leadService = leadService;
        _notificationDispatcher = notificationDispatcher;
        _infraMetricsService = infraMetricsService;
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

    [HttpGet("infra-metrics")]
    [ProducesResponseType(typeof(InfraMetricsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<InfraMetricsResponse>> GetInfraMetricsAsync(CancellationToken cancellationToken)
    {
        if (!IsAuthorized())
        {
            return UnauthorizedResult();
        }

        var metrics = await _infraMetricsService.GetInfraMetricsAsync(cancellationToken);
        return Ok(metrics);
    }

    [HttpPost("test-alert")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult> TestAlertAsync(
        [FromBody] TriggerAlertRequest request,
        CancellationToken cancellationToken)
    {
        if (!IsAuthorized())
        {
            return UnauthorizedResult();
        }

        var severity = string.IsNullOrWhiteSpace(request.Severity) ? "warning" : request.Severity.ToLowerInvariant();
        var title = severity == "critical"
            ? "Cảnh báo thử nghiệm mức NGUY HIỂM (Critical Test Alert)"
            : "Cảnh báo thử nghiệm mức CẢNH GIÁC (Warning Test Alert)";

        var detail = request.CustomMessage ?? "Đây là cảnh báo thử nghiệm được kích hoạt từ Admin Dashboard nhằm kiểm tra luồng cảnh báo sớm tránh sập server.";
        var dummyMetrics = new Dictionary<string, string>
        {
            ["Phòng họp"] = "22/25 (88%)",
            ["Người dùng CCU"] = "18",
            ["RAM tiến trình"] = "1,850 MB",
            ["Trạng thái"] = "TEST_SIMULATION"
        };

        var success = await _notificationDispatcher.DispatchSystemAlertAsync(
            severity,
            title,
            detail,
            dummyMetrics,
            cancellationToken);

        return Ok(new
        {
            success,
            severity,
            message = success
                ? $"Đã phát tín hiệu cảnh báo {severity.ToUpperInvariant()} thành công tới Telegram / Webhook."
                : "Không thể gửi cảnh báo. Vui lòng kiểm tra biến môi trường TELEGRAM_BOT_TOKEN và TELEGRAM_CHAT_ID."
        });
    }
}
