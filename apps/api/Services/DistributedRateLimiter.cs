using System.Collections.Concurrent;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;

namespace AITranslateMeeting.Api.Services;

public interface IDistributedRateLimiter
{
    Task<bool> TryAcquireAsync(string policy, string partitionKey, int limit, TimeSpan window, CancellationToken ct = default);
}

public sealed class DistributedRateLimiter : IDistributedRateLimiter
{
    private readonly IConnectionMultiplexer? _redis;
    private readonly ILogger<DistributedRateLimiter> _logger;
    private readonly ConcurrentDictionary<string, (long WindowNumber, int Count)> _localCache = new();

    public DistributedRateLimiter(
        ILogger<DistributedRateLimiter> logger,
        IConnectionMultiplexer? redis = null)
    {
        _logger = logger;
        _redis = redis;
    }

    public async Task<bool> TryAcquireAsync(
        string policy,
        string partitionKey,
        int limit,
        TimeSpan window,
        CancellationToken ct = default)
    {
        var windowSeconds = (long)Math.Max(1, window.TotalSeconds);
        var nowUnix = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var currentWindow = nowUnix / windowSeconds;

        if (_redis != null && _redis.IsConnected)
        {
            try
            {
                var db = _redis.GetDatabase();
                var redisKey = $"ratelimit:{policy}:{partitionKey}:{currentWindow}";

                var count = await db.StringIncrementAsync(redisKey);
                if (count == 1)
                {
                    await db.KeyExpireAsync(redisKey, TimeSpan.FromSeconds(windowSeconds + 5));
                }

                return count <= limit;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Redis rate limiting unavailable for policy {Policy}, falling back to local memory", policy);
            }
        }

        // Local in-memory fallback
        var localKey = $"{policy}:{partitionKey}";
        var updated = _localCache.AddOrUpdate(
            localKey,
            _ => (currentWindow, 1),
            (_, existing) =>
            {
                if (existing.WindowNumber != currentWindow)
                {
                    return (currentWindow, 1);
                }
                return (existing.WindowNumber, existing.Count + 1);
            });

        return updated.Count <= limit;
    }
}
