using AITranslateMeeting.Api.Data;
using Microsoft.EntityFrameworkCore;
using StackExchange.Redis;

namespace AITranslateMeeting.Api.Health;

public interface IReadinessEvaluator
{
    Task<DependencyHealthStatus> EvaluateAsync(CancellationToken cancellationToken = default);
}

public sealed record DependencyHealthStatus(bool DatabaseHealthy, RedisHealthState Redis)
{
    public string DatabaseStatus => DatabaseHealthy ? "healthy" : "unhealthy";
    public string RedisStatus => Redis switch
    {
        RedisHealthState.Healthy => "healthy",
        RedisHealthState.Unhealthy => "unhealthy",
        _ => "not_configured"
    };

    public bool IsReady(bool requireRedis) =>
        DatabaseHealthy &&
        (Redis == RedisHealthState.Healthy || (!requireRedis && Redis == RedisHealthState.NotConfigured));

    public bool IsHealthy => DatabaseHealthy && Redis != RedisHealthState.Unhealthy;
}

public enum RedisHealthState
{
    NotConfigured,
    Healthy,
    Unhealthy
}

public sealed class ReadinessEvaluator : IReadinessEvaluator
{
    private readonly AppDbContext _dbContext;
    private readonly IConnectionMultiplexer? _redis;
    private readonly ILogger<ReadinessEvaluator> _logger;

    public ReadinessEvaluator(
        AppDbContext dbContext,
        ILogger<ReadinessEvaluator> logger,
        IConnectionMultiplexer? redis = null)
    {
        _dbContext = dbContext;
        _logger = logger;
        _redis = redis;
    }

    public async Task<DependencyHealthStatus> EvaluateAsync(CancellationToken cancellationToken = default)
    {
        var databaseHealthy = false;
        try
        {
            databaseHealthy = await _dbContext.Database.CanConnectAsync(cancellationToken);
        }
        catch
        {
            _logger.LogWarning("Readiness check: Database connection failed.");
        }

        if (_redis is null)
        {
            return new DependencyHealthStatus(databaseHealthy, RedisHealthState.NotConfigured);
        }

        try
        {
            var redisState = _redis.IsConnected
                ? RedisHealthState.Healthy
                : RedisHealthState.Unhealthy;
            return new DependencyHealthStatus(databaseHealthy, redisState);
        }
        catch
        {
            _logger.LogWarning("Readiness check: Redis connection failed.");
            return new DependencyHealthStatus(databaseHealthy, RedisHealthState.Unhealthy);
        }
    }
}
