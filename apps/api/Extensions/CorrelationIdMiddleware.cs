using Microsoft.AspNetCore.Http;
using Serilog.Context;

namespace AITranslateMeeting.Api.Extensions;

public class CorrelationIdMiddleware
{
    public const string CorrelationHeaderName = "X-Correlation-ID";
    private const string RequestIdHeaderName = "X-Request-ID";

    private readonly RequestDelegate _next;

    public CorrelationIdMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var correlationId = GetOrGenerateCorrelationId(context);

        context.Items[CorrelationHeaderName] = correlationId;

        context.Response.OnStarting(() =>
        {
            if (!context.Response.Headers.ContainsKey(CorrelationHeaderName))
            {
                context.Response.Headers[CorrelationHeaderName] = correlationId;
            }
            return Task.CompletedTask;
        });

        using (LogContext.PushProperty("CorrelationId", correlationId))
        {
            await _next(context);
        }
    }

    private static string GetOrGenerateCorrelationId(HttpContext context)
    {
        if (context.Request.Headers.TryGetValue(CorrelationHeaderName, out var correlationHeader) &&
            !string.IsNullOrWhiteSpace(correlationHeader))
        {
            return correlationHeader.ToString().Trim();
        }

        if (context.Request.Headers.TryGetValue(RequestIdHeaderName, out var requestIdHeader) &&
            !string.IsNullOrWhiteSpace(requestIdHeader))
        {
            return requestIdHeader.ToString().Trim();
        }

        return Guid.NewGuid().ToString("N");
    }
}
