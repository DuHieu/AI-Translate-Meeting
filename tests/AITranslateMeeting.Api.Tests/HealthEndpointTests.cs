using System.Net;
using System.Text.Json;
using AITranslateMeeting.Api.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Moq;
using StackExchange.Redis;
using Xunit;

namespace AITranslateMeeting.Api.Tests;

public sealed class HealthEndpointTests
{
    [Fact]
    public async Task Health_WhenDatabaseUnavailable_ReturnsSanitizedProblemDetails()
    {
        await using var factory = CreateFactory("Development", useHealthyDatabase: false);
        using var client = factory.CreateClient();

        using var response = await client.GetAsync("/health");
        var body = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        Assert.DoesNotContain("127.0.0.1", body);
        Assert.DoesNotContain("Database=test", body, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Ready_InProductionWithoutRedis_ReturnsSanitizedProblemDetails()
    {
        await using var factory = CreateFactory("Production", useHealthyDatabase: true);
        using var client = factory.CreateClient();

        using var response = await client.GetAsync("/health/ready");
        var body = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        Assert.Equal("not_configured", ReadJsonString(body, "redis"));
        Assert.DoesNotContain("Password", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("production-db-secret", body, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Ready_InProductionWithDisconnectedRedis_ReturnsSanitizedProblemDetails()
    {
        var redis = new Mock<IConnectionMultiplexer>();
        redis.SetupGet(connection => connection.IsConnected).Returns(false);
        await using var factory = CreateFactory("Production", useHealthyDatabase: true, redis.Object);
        using var client = factory.CreateClient();

        using var response = await client.GetAsync("/health/ready");
        var body = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        Assert.Equal("unhealthy", ReadJsonString(body, "redis"));
    }

    [Fact]
    public async Task Ready_DoesNotExposeRedisExceptionOrSecret()
    {
        const string sensitiveDetail = "redis://admin:redis-secret@cache.internal:6379";
        var redis = new Mock<IConnectionMultiplexer>();
        redis.SetupGet(connection => connection.IsConnected)
            .Throws(new InvalidOperationException(sensitiveDetail));
        await using var factory = CreateFactory("Production", useHealthyDatabase: true, redis.Object);
        using var client = factory.CreateClient();

        using var response = await client.GetAsync("/health/ready");
        var body = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        Assert.DoesNotContain(sensitiveDetail, body, StringComparison.Ordinal);
        Assert.DoesNotContain("redis-secret", body, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Ready_InProductionWithHealthyDatabaseAndRedis_ReturnsReady()
    {
        var redis = new Mock<IConnectionMultiplexer>();
        redis.SetupGet(connection => connection.IsConnected).Returns(true);
        await using var factory = CreateFactory("Production", useHealthyDatabase: true, redis.Object);
        using var client = factory.CreateClient();

        using var response = await client.GetAsync("/health/ready");
        var body = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("ready", ReadJsonString(body, "status"));
        Assert.Equal("healthy", ReadJsonString(body, "database"));
        Assert.Equal("healthy", ReadJsonString(body, "redis"));
    }

    [Fact]
    public async Task Live_InProductionWithoutRedis_ReturnsLive()
    {
        await using var factory = CreateFactory("Production", useHealthyDatabase: true);
        using var client = factory.CreateClient();

        using var response = await client.GetAsync("/health/live");
        var body = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("live", ReadJsonString(body, "status"));
    }

    [Fact]
    public async Task Ready_InDevelopmentWithoutRedis_ReportsNotConfiguredFallback()
    {
        await using var factory = CreateFactory("Development", useHealthyDatabase: true);
        using var client = factory.CreateClient();

        using var response = await client.GetAsync("/health/ready");
        var body = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("ready", ReadJsonString(body, "status"));
        Assert.Equal("not_configured", ReadJsonString(body, "redis"));
    }

    private static WebApplicationFactory<Program> CreateFactory(
        string environment,
        bool useHealthyDatabase,
        IConnectionMultiplexer? redis = null)
    {
        return new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment(environment);
            builder.UseSetting(
                "ConnectionStrings:DefaultConnection",
                "Host=127.0.0.1;Port=1;Database=test;Username=test;Password=production-db-secret;Timeout=1");
            builder.UseSetting("Redis:ConnectionString", string.Empty);
            builder.UseSetting("DatabaseCleanup:Enabled", "false");
            builder.UseSetting("Cors:AllowedOrigins:0", "http://localhost:3000");
            builder.UseSetting("LiveKit:InternalUrl", "http://localhost:7880");
            builder.UseSetting("LiveKit:PublicUrl", "ws://localhost:7880");
            builder.UseSetting("LiveKit:ApiKey", "health-test-key");
            builder.UseSetting("LiveKit:ApiSecret", "lk-0123456789-abcdefghijklmnopqrstuvwxyz");
            builder.UseSetting("SubtitleToken:SigningKey", "subtitle-0123456789-abcdefghijklmnopqr");
            builder.UseSetting("AdmissionToken:SigningKey", "admission-0123456789-abcdefghijklmnopqr");
            builder.UseSetting("SessionToken:SigningKey", "session-0123456789-abcdefghijklmnopqrst");

            if (useHealthyDatabase || redis is not null)
            {
                builder.ConfigureTestServices(services =>
                {
                    if (useHealthyDatabase)
                    {
                        services.RemoveAll<AppDbContext>();
                        services.RemoveAll<DbContextOptions<AppDbContext>>();
                        services.AddDbContext<AppDbContext>(options =>
                            options.UseInMemoryDatabase($"health-{Guid.NewGuid():N}"));
                    }

                    if (redis is not null)
                    {
                        services.RemoveAll<IConnectionMultiplexer>();
                        services.AddSingleton(redis);
                    }
                });
            }
        });
    }

    private static string? ReadJsonString(string json, string propertyName)
    {
        using var document = JsonDocument.Parse(json);
        return document.RootElement.TryGetProperty(propertyName, out var value)
            ? value.GetString()
            : null;
    }
}
