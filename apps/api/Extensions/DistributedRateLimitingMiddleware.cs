using AITranslateMeeting.Api.Options;
using AITranslateMeeting.Api.Services;
using AITranslateMeeting.Api.Security;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;

namespace AITranslateMeeting.Api.Extensions;

public sealed class DistributedRateLimitingMiddleware
{
    private static readonly TimeSpan DefaultWindow = TimeSpan.FromMinutes(1);

    private static readonly IReadOnlyDictionary<string, int> DefaultPolicyLimits = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
    {
        ["CreateMeeting"] = 10,
        ["JoinAdmission"] = 30,
        ["HostAdmission"] = 120
    };

    private readonly RequestDelegate _next;
    private readonly IDistributedRateLimiter _rateLimiter;
    private readonly RateLimitingOptions _options;

    public DistributedRateLimitingMiddleware(
        RequestDelegate next,
        IDistributedRateLimiter rateLimiter,
        IOptions<RateLimitingOptions>? options = null)
    {
        _next = next;
        _rateLimiter = rateLimiter;
        _options = options?.Value ?? new RateLimitingOptions();
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (!_options.Enabled)
        {
            await _next(context);
            return;
        }

        var endpoint = context.GetEndpoint();
        var rateLimitAttr = endpoint?.Metadata.GetMetadata<EnableRateLimitingAttribute>();

        if (rateLimitAttr?.PolicyName != null)
        {
            int baseLimit;
            if (_options.PolicyLimits.TryGetValue(rateLimitAttr.PolicyName, out var customLimit))
            {
                baseLimit = customLimit;
            }
            else if (!DefaultPolicyLimits.TryGetValue(rateLimitAttr.PolicyName, out baseLimit))
            {
                await _next(context);
                return;
            }

            var multiplier = Math.Max(1, _options.Multiplier);
            var limit = baseLimit * multiplier;

            // ForwardedHeadersMiddleware has already replaced RemoteIpAddress only
            // when the immediate sender is an explicitly trusted reverse proxy.
            var partitionKey = ClientIpResolver.Resolve(context);

            var allowed = await _rateLimiter.TryAcquireAsync(
                rateLimitAttr.PolicyName,
                partitionKey,
                limit,
                DefaultWindow,
                context.RequestAborted);

            if (!allowed)
            {
                context.Response.StatusCode = StatusCodes.Status429TooManyRequests;
                context.Response.Headers["Retry-After"] = "60";

                await Results.Problem(
                    statusCode: StatusCodes.Status429TooManyRequests,
                    title: "Too many requests",
                    detail: $"Rate limit exceeded for policy '{rateLimitAttr.PolicyName}'. Please wait before retrying.")
                    .ExecuteAsync(context);
                return;
            }
        }

        await _next(context);
    }
}
