using System.Net;
using System.Text.Json;
using AITranslateMeeting.Api.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Xunit;

namespace AITranslateMeeting.Api.Tests;

public sealed class AdminControllerTests
{
    private const string TestAdminKey = "test-admin-secret-key-12345";

    [Fact]
    public async Task GetMetrics_WhenUnauthorized_Returns401ProblemDetails()
    {
        await using var factory = CreateFactory();
        using var client = factory.CreateClient();

        using var response = await client.GetAsync("/api/admin/metrics");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        Assert.Equal(401, doc.RootElement.GetProperty("status").GetInt32());
    }

    [Fact]
    public async Task GetMetrics_WhenAuthorized_ReturnsMetricsData()
    {
        await using var factory = CreateFactory();
        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Admin-Key", TestAdminKey);

        using var response = await client.GetAsync("/api/admin/metrics");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;

        Assert.True(root.TryGetProperty("activeMeetings", out _));
        Assert.True(root.TryGetProperty("totalOrders", out _));
        Assert.True(root.TryGetProperty("paidOrders", out _));
        Assert.True(root.TryGetProperty("totalRevenueVnd", out _));
        Assert.True(root.TryGetProperty("totalLeads", out _));
    }

    [Fact]
    public async Task GetOrders_WhenAuthorized_ReturnsOrderList()
    {
        await using var factory = CreateFactory();
        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Admin-Key", TestAdminKey);

        using var response = await client.GetAsync("/api/admin/orders");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        Assert.Equal(JsonValueKind.Array, doc.RootElement.ValueKind);
    }

    [Fact]
    public async Task GetLeads_WhenAuthorized_ReturnsLeadList()
    {
        await using var factory = CreateFactory();
        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Admin-Key", TestAdminKey);

        using var response = await client.GetAsync("/api/admin/leads");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        Assert.Equal(JsonValueKind.Array, doc.RootElement.ValueKind);
    }

    [Fact]
    public async Task TestNotification_WhenAuthorized_ReturnsResult()
    {
        await using var factory = CreateFactory();
        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Admin-Key", TestAdminKey);

        using var response = await client.PostAsync("/api/admin/test-notification", null);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        Assert.True(doc.RootElement.TryGetProperty("message", out _));
    }

    private static WebApplicationFactory<Program> CreateFactory()
    {
        return new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Development");
            builder.UseSetting("DEPLOYMENT_PROFILE", "pilot");
            builder.UseSetting("Admin:SecretKey", TestAdminKey);
            builder.UseSetting(
                "ConnectionStrings:DefaultConnection",
                "Host=127.0.0.1;Port=5432;Database=test;Username=test;Password=secret-pass;Timeout=1");
            builder.UseSetting("Redis:ConnectionString", string.Empty);
            builder.UseSetting("Cors:AllowedOrigins:0", "http://localhost:3000");
            builder.UseSetting("LiveKit:InternalUrl", "http://localhost:7880");
            builder.UseSetting("LiveKit:PublicUrl", "ws://localhost:7880");
            builder.UseSetting("LiveKit:ApiKey", "system-test-key-16");
            builder.UseSetting("LiveKit:ApiSecret", "livekit-signing-key-0123456789-abcdef");
            builder.UseSetting("SubtitleToken:SigningKey", "subtitle-signing-key-0123456789-abcdef");
            builder.UseSetting("AdmissionToken:SigningKey", "admission-signing-key-0123456789-abcdef");
            builder.UseSetting("SessionToken:SigningKey", "session-signing-key-0123456789-abcdef");

            var dbName = $"admin-{Guid.NewGuid():N}";
            builder.ConfigureTestServices(services =>
            {
                services.RemoveAll<AppDbContext>();
                services.RemoveAll<DbContextOptions<AppDbContext>>();
                services.AddDbContext<AppDbContext>(options =>
                    options.UseInMemoryDatabase(dbName));
            });
        });
    }
}
