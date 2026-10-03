using AITranslateMeeting.Api.Services;
using AITranslateMeeting.Api.Security;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.RateLimiting;

namespace AITranslateMeeting.Api.Extensions;

public sealed class DistributedRateLimitingMiddleware
{
    private static readonly TimeSpan DefaultWindow = TimeSpan.FromMinutes(1);

    private static readonly IReadOnlyDictionary<string, int> PolicyLimits = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
    {
        ["CreateMeeting"] = 10,
        ["JoinAdmission"] = 30,
        ["HostAdmission"] = 120
    };

    private readonly RequestDelegate _next;
    private readonly IDistributedRateLimiter _rateLimiter;

    public DistributedRateLimitingMiddleware(
        RequestDelegate next,
        IDistributedRateLimiter rateLimiter)
    {
        _next = next;
        _rateLimiter = rateLimiter;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var endpoint = context.GetEndpoint();
        var rateLimitAttr = endpoint?.Metadata.GetMetadata<EnableRateLimitingAttribute>();

        if (rateLimitAttr?.PolicyName != null && PolicyLimits.TryGetValue(rateLimitAttr.PolicyName, out var limit))
        {
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
