using AITranslateMeeting.Api.Extensions;
using Microsoft.AspNetCore.Http;
using Xunit;

namespace AITranslateMeeting.Api.Tests;

public class ObservabilityTests
{
    [Fact]
    public async Task CorrelationIdMiddleware_GeneratesNewId_WhenHeaderMissing()
    {
        var context = new DefaultHttpContext();
        var nextExecuted = false;

        var middleware = new CorrelationIdMiddleware(ctx =>
        {
            nextExecuted = true;
            return Task.CompletedTask;
        });

        await middleware.InvokeAsync(context);

        Assert.True(nextExecuted);
        var correlationId = context.Items[CorrelationIdMiddleware.CorrelationHeaderName]?.ToString();
        Assert.False(string.IsNullOrWhiteSpace(correlationId));
        Assert.True(Guid.TryParse(correlationId, out _));
    }

    [Fact]
    public async Task CorrelationIdMiddleware_PropagatesExistingId_WhenHeaderPresent()
    {
        var context = new DefaultHttpContext();
        const string customId = "trace-corp-abc-123";
        context.Request.Headers[CorrelationIdMiddleware.CorrelationHeaderName] = customId;

        var nextExecuted = false;
        var middleware = new CorrelationIdMiddleware(ctx =>
        {
            nextExecuted = true;
            return Task.CompletedTask;
        });

        await middleware.InvokeAsync(context);

        Assert.True(nextExecuted);
        var correlationId = context.Items[CorrelationIdMiddleware.CorrelationHeaderName]?.ToString();
        Assert.Equal(customId, correlationId);
    }

    [Fact]
    public async Task CorrelationIdMiddleware_AcceptsRequestId_AsFallback()
    {
        var context = new DefaultHttpContext();
        const string requestId = "request-xyz-987";
        context.Request.Headers["X-Request-ID"] = requestId;

        var nextExecuted = false;
        var middleware = new CorrelationIdMiddleware(ctx =>
        {
            nextExecuted = true;
            return Task.CompletedTask;
        });

        await middleware.InvokeAsync(context);

        Assert.True(nextExecuted);
        var correlationId = context.Items[CorrelationIdMiddleware.CorrelationHeaderName]?.ToString();
        Assert.Equal(requestId, correlationId);
    }
}
