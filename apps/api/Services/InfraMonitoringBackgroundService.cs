using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace AITranslateMeeting.Api.Services;

public sealed class InfraMonitoringBackgroundService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<InfraMonitoringBackgroundService> _logger;

    private string _lastAlertSeverity = "normal";
    private DateTime _lastAlertTime = DateTime.MinValue;
    private static readonly TimeSpan AlertCooldown = TimeSpan.FromMinutes(5);

    public InfraMonitoringBackgroundService(
        IServiceScopeFactory scopeFactory,
        ILogger<InfraMonitoringBackgroundService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("InfraMonitoringBackgroundService started. Monitoring system capacity and early warning thresholds.");

        // Wait 15 seconds after startup before the first evaluation to let all containers settle
        try
        {
            await Task.Delay(TimeSpan.FromSeconds(15), stoppingToken);
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            return;
        }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var metricsService = scope.ServiceProvider.GetRequiredService<IInfraMetricsService>();
                var dispatcher = scope.ServiceProvider.GetRequiredService<INotificationDispatcher>();

                var metrics = await metricsService.GetInfraMetricsAsync(stoppingToken);
                var currentSeverity = metrics.SystemStatus.ToLowerInvariant();
                var now = DateTime.UtcNow;

                if (currentSeverity is "critical" or "warning")
                {
                    var isCooldownExpired = (now - _lastAlertTime) >= AlertCooldown;
                    var isEscalation = currentSeverity == "critical" && _lastAlertSeverity != "critical";

                    if (isCooldownExpired || isEscalation)
                    {
                        var title = currentSeverity == "critical"
                            ? "Cảnh báo khẩn cấp: Hệ thống chạm ngưỡng quá tải!"
                            : "Cảnh báo sớm: Tải hệ thống ở mức cao";

                        var detail = string.Join("; ", metrics.ActiveAlerts);
                        var metricsDict = new Dictionary<string, string>
                        {
                            ["Phòng họp"] = $"{metrics.ActiveRooms}/{metrics.MaxConcurrentRooms} ({metrics.RoomCapacityPercent}%)",
                            ["Người tham gia"] = $"{metrics.ActiveParticipants}",
                            ["RAM tiến trình"] = $"{metrics.ProcessMemoryMb} MB",
                            ["PostgreSQL"] = metrics.DatabaseStatus,
                            ["Redis"] = metrics.RedisStatus
                        };

                        await dispatcher.DispatchSystemAlertAsync(
                            currentSeverity,
                            title,
                            detail,
                            metricsDict,
                            stoppingToken);

                        _lastAlertSeverity = currentSeverity;
                        _lastAlertTime = now;
                    }
                }
                else if (currentSeverity == "normal" && _lastAlertSeverity is "critical" or "warning")
                {
                    // Recovered notification
                    await dispatcher.DispatchSystemAlertAsync(
                        "info",
                        "Hệ thống đã phục hồi trạng thái an toàn",
                        $"Tất cả các chỉ số đã trở lại ngưỡng bình thường (Phòng: {metrics.ActiveRooms}/{metrics.MaxConcurrentRooms}, RAM: {metrics.ProcessMemoryMb} MB).",
                        null,
                        stoppingToken);

                    _lastAlertSeverity = "normal";
                    _lastAlertTime = now;
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error in InfraMonitoringBackgroundService execution cycle");
            }

            try
            {
                await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
        }

        _logger.LogInformation("InfraMonitoringBackgroundService stopped.");
    }
}
