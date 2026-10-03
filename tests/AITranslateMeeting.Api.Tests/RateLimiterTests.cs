using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using AITranslateMeeting.Api.DTOs;
using AITranslateMeeting.Api.Security;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace AITranslateMeeting.Api.Tests;

public sealed class RateLimiterTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public RateLimiterTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task CreateMeeting_WhenLimitExceeded_Returns429ProblemDetails()
    {
        var testIp = $"198.51.100.{Random.Shared.Next(1, 250)}";

        using var client = _factory.WithWebHostBuilder(builder =>
        {
            builder.UseSetting("ConnectionStrings:DefaultConnection", "Host=localhost;Database=test;Username=test;Password=test");
            builder.UseSetting("Cors:AllowedOrigins:0", "http://localhost:3000");
            builder.UseSetting("LiveKit:InternalUrl", "http://localhost:7880");
            builder.UseSetting("LiveKit:PublicUrl", "ws://localhost:7880");
            builder.UseSetting("LiveKit:ApiKey", "test-key");
            builder.UseSetting("LiveKit:ApiSecret", new string('x', 32));
            builder.UseSetting("SubtitleToken:SigningKey", new string('s', 32));
            builder.UseSetting("AdmissionToken:SigningKey", new string('a', 32));
            builder.UseSetting("SessionToken:SigningKey", new string('b', 32));
        }).CreateClient();

        // Policy for CreateMeeting is 10 requests per minute
        HttpResponseMessage? lastResponse = null;
        for (var i = 1; i <= 11; i++)
        {
            var request = new HttpRequestMessage(HttpMethod.Post, "/api/meetings")
            {
                Content = JsonContent.Create(new CreateMeetingRequestDto($"Meeting {i}"))
            };
            request.Headers.Add("X-Forwarded-For", testIp);

            lastResponse = await client.SendAsync(request);

            if (i <= 10)
            {
                // Should not be 429 (might be 201 or 500 depending on DB availability, but not 429)
                Assert.NotEqual(HttpStatusCode.TooManyRequests, lastResponse.StatusCode);
            }
        }

        // The 11th request must be 429 Too Many Requests
        Assert.NotNull(lastResponse);
        Assert.Equal(HttpStatusCode.TooManyRequests, lastResponse.StatusCode);
        Assert.True(lastResponse.Headers.Contains("Retry-After"));

        var content = await lastResponse.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(content);
        var status = doc.RootElement.GetProperty("status").GetInt32();
        Assert.Equal(429, status);
    }

    [Fact]
    public void ClientIpResolver_DoesNotTrustClientSuppliedForwardedForHeader()
    {
        var context = new DefaultHttpContext();
        context.Connection.RemoteIpAddress = IPAddress.Parse("192.0.2.10");
        context.Request.Headers["X-Forwarded-For"] = "203.0.113.99";

        Assert.Equal("192.0.2.10", ClientIpResolver.Resolve(context));
    }

    [Fact]
    public async Task DirectClientCannotRotateForwardedForToBypassRateLimit()
    {
        using var client = _factory.WithWebHostBuilder(builder =>
        {
            builder.UseSetting("ConnectionStrings:DefaultConnection", "Host=localhost;Database=test;Username=test;Password=test");
            builder.UseSetting("Cors:AllowedOrigins:0", "http://localhost:3000");
            builder.UseSetting("LiveKit:InternalUrl", "http://localhost:7880");
            builder.UseSetting("LiveKit:PublicUrl", "ws://localhost:7880");
            builder.UseSetting("LiveKit:ApiKey", "test-key");
            builder.UseSetting("LiveKit:ApiSecret", new string('x', 32));
            builder.UseSetting("SubtitleToken:SigningKey", new string('s', 32));
            builder.UseSetting("AdmissionToken:SigningKey", new string('a', 32));
            builder.UseSetting("SessionToken:SigningKey", new string('b', 32));
        }).CreateClient();

        HttpResponseMessage? lastResponse = null;
        for (var i = 1; i <= 11; i++)
        {
            var request = new HttpRequestMessage(HttpMethod.Post, "/api/meetings")
            {
                Content = JsonContent.Create(new CreateMeetingRequestDto($"Spoof probe {i}"))
            };
            request.Headers.Add("X-Forwarded-For", $"198.51.100.{i}");
            lastResponse = await client.SendAsync(request);
        }

        Assert.NotNull(lastResponse);
        Assert.Equal(HttpStatusCode.TooManyRequests, lastResponse.StatusCode);
    }
}
