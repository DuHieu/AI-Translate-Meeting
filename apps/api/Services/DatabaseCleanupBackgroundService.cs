using AITranslateMeeting.Api.Options;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace AITranslateMeeting.Api.Services;

public class DatabaseCleanupBackgroundService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IOptionsMonitor<DatabaseCleanupOptions> _options;
    private readonly ILogger<DatabaseCleanupBackgroundService> _logger;

    public DatabaseCleanupBackgroundService(
        IServiceScopeFactory scopeFactory,
        IOptionsMonitor<DatabaseCleanupOptions> options,
        ILogger<DatabaseCleanupBackgroundService> logger)
    {
        _scopeFactory = scopeFactory;
        _options = options;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("DatabaseCleanupBackgroundService started.");

        while (!stoppingToken.IsCancellationRequested)
        {
            var config = _options.CurrentValue;
            var interval = TimeSpan.FromHours(Math.Max(1, config.IntervalHours));

            try
            {
                if (config.Enabled)
                {
                    using var scope = _scopeFactory.CreateScope();
                    var cleanupService = scope.ServiceProvider.GetRequiredService<IDatabaseCleanupService>();
                    var retention = TimeSpan.FromHours(Math.Max(1, config.RetentionHours));
                    await cleanupService.CleanupExpiredRecordsAsync(retention, stoppingToken);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error occurred during database cleanup background execution.");
            }

            try
            {
                await Task.Delay(interval, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
        }

        _logger.LogInformation("DatabaseCleanupBackgroundService stopped.");
    }
}
