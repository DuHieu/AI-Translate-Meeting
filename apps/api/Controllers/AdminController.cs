using AITranslateMeeting.Api.Data;
using AITranslateMeeting.Api.DTOs;
using AITranslateMeeting.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StackExchange.Redis;
using System.Security.Cryptography;
using System.Text;

namespace AITranslateMeeting.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class AdminController : ControllerBase
{
    private readonly IBillingService _billingService;
    private readonly ILeadService _leadService;
    private readonly INotificationDispatcher _notificationDispatcher;
    private readonly IInfraMetricsService _infraMetricsService;
    private readonly IDatabaseCleanupService _cleanupService;
    private readonly IParticipantSessionService _sessionTokenService;
    private readonly AppDbContext _dbContext;
    private readonly IConnectionMultiplexer? _redis;
    private readonly string _adminSecretKey;

    public AdminController(
        IBillingService billingService,
        ILeadService leadService,
        INotificationDispatcher notificationDispatcher,
        IInfraMetricsService infraMetricsService,
        IDatabaseCleanupService cleanupService,
        IParticipantSessionService sessionTokenService,
        AppDbContext dbContext,
        IConfiguration configuration,
        IConnectionMultiplexer? redis = null)
    {
        _billingService = billingService;
        _leadService = leadService;
        _notificationDispatcher = notificationDispatcher;
        _infraMetricsService = infraMetricsService;
        _cleanupService = cleanupService;
        _sessionTokenService = sessionTokenService;
        _dbContext = dbContext;
        _redis = redis;
        _adminSecretKey = configuration["Admin:SecretKey"] ?? "vimeet-admin-secret-2026";
    }

    private bool IsAuthorized()
    {
        if (Request.Headers.TryGetValue("X-Admin-Key", out var headerKey))
        {
            var candidate = headerKey.ToString().Trim();
            if (SafeSecretEquals(candidate, _adminSecretKey))
            {
                return true;
            }
        }

        // Restrict query parameter key in production to prevent credential leakage in access logs
        var env = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Production";
        if (!string.Equals(env, "Production", StringComparison.OrdinalIgnoreCase))
        {
            if (Request.Query.TryGetValue("key", out var queryKey))
            {
                var candidate = queryKey.ToString().Trim();
                if (SafeSecretEquals(candidate, _adminSecretKey))
                {
                    return true;
                }
            }
        }

        return false;
    }

    private static bool SafeSecretEquals(string candidate, string expected)
    {
        if (string.IsNullOrEmpty(candidate) || string.IsNullOrEmpty(expected))
        {
            return false;
        }

        var candidateBytes = Encoding.UTF8.GetBytes(candidate);
        var expectedBytes = Encoding.UTF8.GetBytes(expected);

        return CryptographicOperations.FixedTimeEquals(candidateBytes, expectedBytes);
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
            await _cleanupService.CloseIdleMeetingsAsync(TimeSpan.FromMinutes(10), TimeSpan.FromMinutes(2), cancellationToken);
            activeMeetings = await _dbContext.Meetings.CountAsync(m => m.EndedAt == null, cancellationToken);
        }
        catch
        {
            // In-memory or fallback
        }

        var billingMetrics = _billingService.GetMetrics();
        var totalLeads = _leadService.GetLeadCount();

        long totalTokensUsed = 0;
        long proTokensUsed = 0;
        if (_redis != null)
        {
            try
            {
                var db = _redis.GetDatabase();
                var totalVal = await db.HashGetAsync("translation:quota:global", "total_tokens");
                if (totalVal.HasValue && long.TryParse(totalVal, out var t)) totalTokensUsed = t;
                var proVal = await db.HashGetAsync("translation:quota:global", "tier:pro");
                if (proVal.HasValue && long.TryParse(proVal, out var p)) proTokensUsed = p;
            }
            catch
            {
                // Non-blocking fallback
            }
        }

        return Ok(new AdminMetricsResponse(
            ActiveMeetings: activeMeetings,
            TotalOrders: billingMetrics.TotalOrders,
            PaidOrders: billingMetrics.PaidOrders,
            TotalRevenueVnd: billingMetrics.TotalRevenueVnd,
            TotalLeads: totalLeads,
            TelegramConfigured: _notificationDispatcher.IsTelegramConfigured,
            WebhookConfigured: _notificationDispatcher.IsWebhookConfigured,
            GeneratedAtUtc: DateTime.UtcNow,
            TotalTokensUsed: totalTokensUsed,
            ProTokensUsed: proTokensUsed,
            ZaloConfigured: _notificationDispatcher.IsZaloConfigured
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
            "Đây là thông báo kiểm tra hệ thống từ trang quản trị LayaMeet Admin Dashboard.",
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

    [HttpGet("meetings")]
    [ProducesResponseType(typeof(AdminMeetingListResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<AdminMeetingListResponse>> GetMeetingsAsync(
        [FromQuery] string? status = null,
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        if (!IsAuthorized())
        {
            return UnauthorizedResult();
        }

        try
        {
            await _cleanupService.CloseIdleMeetingsAsync(TimeSpan.FromMinutes(10), TimeSpan.FromMinutes(2), cancellationToken);
        }
        catch
        {
            // Non-blocking for listing
        }

        var query = _dbContext.Meetings
            .Include(m => m.Participants)
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLowerInvariant();
            query = query.Where(m => m.MeetingCode.ToLower().Contains(s) || m.Name.ToLower().Contains(s));
        }

        var allMeetings = await query
            .OrderByDescending(m => m.CreatedAt)
            .ToListAsync(cancellationToken);

        var now = DateTime.UtcNow;
        var dtos = allMeetings.Select(m =>
        {
            var activeParts = m.Participants?.Count(p => p.LeftAt == null) ?? 0;
            var totalParts = m.Participants?.Count ?? 0;
            var isActive = m.EndedAt == null;
            var duration = m.EndedAt.HasValue
                ? Math.Round((m.EndedAt.Value - m.CreatedAt).TotalMinutes, 1)
                : Math.Round((now - m.CreatedAt).TotalMinutes, 1);

            return new AdminMeetingDto(
                m.Id,
                m.MeetingCode,
                m.RoomName,
                m.Name,
                m.CreatedAt,
                m.EndedAt,
                activeParts,
                totalParts,
                isActive,
                Math.Max(0, duration)
            );
        }).ToList();

        var totalCount = dtos.Count;
        var activeCount = dtos.Count(d => d.IsActive);
        var endedCount = dtos.Count(d => !d.IsActive);

        if (string.Equals(status, "active", StringComparison.OrdinalIgnoreCase))
        {
            dtos = dtos.Where(d => d.IsActive).ToList();
        }
        else if (string.Equals(status, "ended", StringComparison.OrdinalIgnoreCase))
        {
            dtos = dtos.Where(d => !d.IsActive).ToList();
        }

        var p = Math.Max(1, page);
        var ps = Math.Clamp(pageSize, 1, 200);
        var paged = dtos.Skip((p - 1) * ps).Take(ps).ToList();

        return Ok(new AdminMeetingListResponse(
            paged,
            totalCount,
            activeCount,
            endedCount
        ));
    }

    [HttpPost("meetings/{meetingCode}/close")]
    [ProducesResponseType(typeof(CloseMeetingResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CloseMeetingResponse>> CloseMeetingAsync(
        [FromRoute] string meetingCode,
        CancellationToken cancellationToken)
    {
        if (!IsAuthorized())
        {
            return UnauthorizedResult();
        }

        var meeting = await _dbContext.Meetings
            .Include(m => m.Participants)
            .FirstOrDefaultAsync(m => m.MeetingCode == meetingCode, cancellationToken);

        if (meeting == null)
        {
            return NotFound(new ProblemDetails
            {
                Title = "Not Found",
                Detail = $"Phòng họp với mã '{meetingCode}' không tồn tại.",
                Status = StatusCodes.Status404NotFound
            });
        }

        var now = DateTime.UtcNow;

        if (meeting.EndedAt != null)
        {
            return Ok(new CloseMeetingResponse(
                true,
                meeting.MeetingCode,
                "Phòng họp đã được kết thúc trước đó.",
                meeting.EndedAt.Value
            ));
        }

        meeting.EndedAt = now;

        if (meeting.Participants != null)
        {
            foreach (var p in meeting.Participants.Where(p => p.LeftAt == null))
            {
                p.LeftAt = now;
            }
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        try
        {
            await _sessionTokenService.RevokeMeetingSessionsAsync(meeting.Id, cancellationToken);
        }
        catch
        {
            // Session revocation error should not block meeting close
        }

        return Ok(new CloseMeetingResponse(
            true,
            meeting.MeetingCode,
            $"Đã kết thúc phòng họp '{meeting.Name}' ({meeting.MeetingCode}) thành công.",
            now
        ));
    }

    [HttpGet("feedbacks")]
    [ProducesResponseType(typeof(IReadOnlyList<MeetingFeedbackResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<IReadOnlyList<MeetingFeedbackResponseDto>>> GetFeedbacksAsync(
        [FromQuery] int limit = 100,
        CancellationToken cancellationToken = default)
    {
        if (!IsAuthorized())
        {
            return UnauthorizedResult();
        }

        var feedbacks = await _dbContext.MeetingFeedbacks
            .AsNoTracking()
            .OrderByDescending(f => f.CreatedAt)
            .Take(Math.Clamp(limit, 1, 500))
            .Select(f => new MeetingFeedbackResponseDto(
                f.Id,
                f.MeetingCode,
                f.Rating,
                f.Category,
                f.Comment,
                f.UserName,
                f.UserEmail,
                f.CreatedAt))
            .ToListAsync(cancellationToken);

        return Ok(feedbacks);
    }
}
