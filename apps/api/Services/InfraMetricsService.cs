using System.Diagnostics;
using AITranslateMeeting.Api.Data;
using AITranslateMeeting.Api.DTOs;
using AITranslateMeeting.Api.Health;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;

namespace AITranslateMeeting.Api.Services;

public interface IInfraMetricsService
{
    Task<InfraMetricsResponse> GetInfraMetricsAsync(CancellationToken cancellationToken = default);
}

public sealed class InfraMetricsService : IInfraMetricsService
{
    private readonly AppDbContext _dbContext;
    private readonly IReadinessEvaluator _readinessEvaluator;
    private readonly ILicenseService _licenseService;
    private readonly INotificationDispatcher _notificationDispatcher;
    private readonly IConnectionMultiplexer? _redis;
    private readonly ILogger<InfraMetricsService> _logger;

    public InfraMetricsService(
        AppDbContext dbContext,
        IReadinessEvaluator readinessEvaluator,
        ILicenseService licenseService,
        INotificationDispatcher notificationDispatcher,
        ILogger<InfraMetricsService> logger,
        IConnectionMultiplexer? redis = null)
    {
        _dbContext = dbContext;
        _readinessEvaluator = readinessEvaluator;
        _licenseService = licenseService;
        _notificationDispatcher = notificationDispatcher;
        _logger = logger;
        _redis = redis;
    }

    public async Task<InfraMetricsResponse> GetInfraMetricsAsync(CancellationToken cancellationToken = default)
    {
        // 1. Process Memory & GC stats
        double processMemoryMb = 0;
        double gcAllocatedMb = 0;
        try
        {
            using var proc = Process.GetCurrentProcess();
            processMemoryMb = Math.Round((double)proc.WorkingSet64 / (1024 * 1024), 1);
            gcAllocatedMb = Math.Round((double)GC.GetTotalMemory(false) / (1024 * 1024), 1);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to retrieve system process metrics");
        }

        // 2. Active rooms & participants
        var activeRooms = 0;
        var activeParticipants = 0;
        var now = DateTime.UtcNow;
        var activeCutoff = now.AddHours(-4);

        try
        {
            activeRooms = await _dbContext.Meetings
                .CountAsync(m => m.EndedAt == null && (m.CreatedAt >= activeCutoff || _dbContext.MeetingParticipants.Any(p => p.MeetingId == m.Id && p.LeftAt == null && p.JoinedAt >= activeCutoff)), cancellationToken);

            activeParticipants = await _dbContext.MeetingParticipants
                .CountAsync(p => p.LeftAt == null && p.JoinedAt >= activeCutoff && p.Meeting.EndedAt == null, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to query database for active meetings and participants");
        }

        var license = _licenseService.GetCurrentLicense();
        var maxRooms = license.MaxConcurrentRooms;
        var roomCapacityPercent = maxRooms > 0
            ? Math.Round((double)activeRooms / maxRooms * 100.0, 1)
            : 0;

        // 3. Dependencies health & Redis latency
        var depStatus = await _readinessEvaluator.EvaluateAsync(cancellationToken);
        double? redisLatencyMs = null;

        if (_redis != null && _redis.IsConnected)
        {
            try
            {
                var sw = Stopwatch.StartNew();
                await _redis.GetDatabase().PingAsync();
                sw.Stop();
                redisLatencyMs = Math.Round(sw.Elapsed.TotalMilliseconds, 1);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to ping Redis server");
            }
        }

        // 4. Threshold analysis & indicators
        var indicators = new List<InfraHealthIndicator>();
        var activeAlerts = new List<string>();

        // Indicator: Memory
        var memStatus = processMemoryMb >= 2500 ? "critical" : (processMemoryMb >= 1500 ? "warning" : "healthy");
        var memMsg = memStatus switch
        {
            "critical" => $"Bộ nhớ RAM tiến trình ({processMemoryMb} MB) vượt ngưỡng nguy hiểm (2.5 GB)!",
            "warning" => $"Bộ nhớ RAM tiến trình ({processMemoryMb} MB) ở mức cao (>1.5 GB).",
            _ => $"Bộ nhớ RAM bình thường ({processMemoryMb} MB)."
        };
        indicators.Add(new InfraHealthIndicator("Process Memory", memStatus, memMsg, processMemoryMb, "MB"));
        if (memStatus != "healthy") activeAlerts.Add(memMsg);

        // Indicator: Room Capacity
        var capStatus = roomCapacityPercent >= 90 ? "critical" : (roomCapacityPercent >= 75 ? "warning" : "healthy");
        var capMsg = capStatus switch
        {
            "critical" => $"Dung lượng phòng họp đạt {roomCapacityPercent}% ({activeRooms}/{maxRooms} phòng) - Sắp chạm giới hạn!",
            "warning" => $"Dung lượng phòng họp đạt {roomCapacityPercent}% ({activeRooms}/{maxRooms} phòng).",
            _ => $"Tải phòng họp trong ngưỡng an toàn ({activeRooms}/{maxRooms} phòng)."
        };
        indicators.Add(new InfraHealthIndicator("Room Capacity", capStatus, capMsg, roomCapacityPercent, "%"));
        if (capStatus != "healthy") activeAlerts.Add(capMsg);

        // Indicator: Database
        var dbStatus = depStatus.DatabaseHealthy ? "healthy" : "critical";
        var dbMsg = depStatus.DatabaseHealthy ? "Kết nối PostgreSQL ổn định." : "Mất kết nối tới cơ sở dữ liệu PostgreSQL!";
        indicators.Add(new InfraHealthIndicator("PostgreSQL Database", dbStatus, dbMsg));
        if (dbStatus != "healthy") activeAlerts.Add(dbMsg);

        // Indicator: Redis
        var redisStatus = depStatus.Redis == RedisHealthState.Healthy ? "healthy"
            : (depStatus.Redis == RedisHealthState.Unhealthy ? "critical" : "warning");
        var redisMsg = depStatus.Redis switch
        {
            RedisHealthState.Healthy => $"Redis kết nối tốt (RTT: {redisLatencyMs ?? 0} ms).",
            RedisHealthState.Unhealthy => "Mất kết nối tới Redis cache!",
            _ => "Redis chưa được cấu hình."
        };
        indicators.Add(new InfraHealthIndicator("Redis Cache", redisStatus, redisMsg, redisLatencyMs, "ms"));
        if (redisStatus == "critical") activeAlerts.Add(redisMsg);

        // Overall System Status
        var overallStatus = indicators.Any(i => i.Status == "critical") ? "critical"
            : (indicators.Any(i => i.Status == "warning") ? "warning" : "normal");

        return new InfraMetricsResponse(
            SystemStatus: overallStatus,
            ProcessMemoryMb: processMemoryMb,
            GcAllocatedMb: gcAllocatedMb,
            ActiveRooms: activeRooms,
            ActiveParticipants: activeParticipants,
            MaxConcurrentRooms: maxRooms,
            RoomCapacityPercent: roomCapacityPercent,
            DatabaseStatus: depStatus.DatabaseStatus,
            RedisStatus: depStatus.RedisStatus,
            RedisLatencyMs: redisLatencyMs,
            Indicators: indicators,
            ActiveAlerts: activeAlerts,
            TelegramConfigured: _notificationDispatcher.IsTelegramConfigured,
            TimestampUtc: DateTime.UtcNow
        );
    }
}
