using System.Text.Json;
using AITranslateMeeting.Api.Exceptions;
using AITranslateMeeting.Api.Extensions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace AITranslateMeeting.Api.Tests;

public sealed class ExceptionHandlingMiddlewareTests
{
    [Fact]
    public async Task AdmissionFailure_ReturnsRfc7807_WithStableCode()
    {
        const string secretLikeInput = "secret-token-must-not-leak";
        RequestDelegate next = _ => throw new AdmissionException(
            StatusCodes.Status403Forbidden,
            "admission_wrong_meeting",
            "Admission denied",
            "The admission token belongs to another meeting.");
        var middleware = new ExceptionHandlingMiddleware(
            next,
            Mock.Of<ILogger<ExceptionHandlingMiddleware>>());
        var context = new DefaultHttpContext();
        context.Request.Path = "/api/meetings/ROOM02/join";
        context.Request.Headers.Authorization = $"Bearer {secretLikeInput}";
        context.Response.Body = new MemoryStream();

        await middleware.InvokeAsync(context);

        context.Response.Body.Position = 0;
        using var document = await JsonDocument.ParseAsync(context.Response.Body);
        Assert.Equal(StatusCodes.Status403Forbidden, context.Response.StatusCode);
        Assert.Equal("application/problem+json", context.Response.ContentType);
        Assert.Equal("admission_wrong_meeting", document.RootElement.GetProperty("code").GetString());
        Assert.DoesNotContain(secretLikeInput, document.RootElement.GetRawText());
    }
}
