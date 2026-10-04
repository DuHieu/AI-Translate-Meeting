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

    [Fact]
    public async Task GetInfraMetrics_WhenAuthorized_ReturnsInfraMetricsData()
    {
        await using var factory = CreateFactory();
        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Admin-Key", TestAdminKey);

        using var response = await client.GetAsync("/api/admin/infra-metrics");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;

        Assert.True(root.TryGetProperty("systemStatus", out var statusProp));
        Assert.False(string.IsNullOrWhiteSpace(statusProp.GetString()));
        Assert.True(root.TryGetProperty("processMemoryMb", out _));
        Assert.True(root.TryGetProperty("activeRooms", out _));
        Assert.True(root.TryGetProperty("maxConcurrentRooms", out _));
        Assert.True(root.TryGetProperty("roomCapacityPercent", out _));
        Assert.True(root.TryGetProperty("indicators", out var indProp));
        Assert.Equal(JsonValueKind.Array, indProp.ValueKind);
    }

    [Fact]
    public async Task TestAlert_WhenAuthorized_ReturnsSuccessResult()
    {
        await using var factory = CreateFactory();
        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Admin-Key", TestAdminKey);

        using var content = new StringContent(
            JsonSerializer.Serialize(new { severity = "warning", customMessage = "Test alert from unit test" }),
            System.Text.Encoding.UTF8,
            "application/json");

        using var response = await client.PostAsync("/api/admin/test-alert", content);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;

        Assert.True(root.TryGetProperty("severity", out var sevProp));
        Assert.Equal("warning", sevProp.GetString());
        Assert.True(root.TryGetProperty("message", out _));
    }

    [Fact]
    public async Task GetMeetings_WhenUnauthorized_Returns401ProblemDetails()
    {
        await using var factory = CreateFactory();
        using var client = factory.CreateClient();

        using var response = await client.GetAsync("/api/admin/meetings");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetMeetings_WhenAuthorized_ReturnsMeetingListResponse()
    {
        await using var factory = CreateFactory();

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.Meetings.Add(new Entities.Meeting
            {
                Id = Guid.NewGuid(),
                MeetingCode = "TEST99",
                RoomName = "meeting_TEST99",
                Name = "Unit Test Room",
                CreatedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        }

        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Admin-Key", TestAdminKey);

        using var response = await client.GetAsync("/api/admin/meetings");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;

        Assert.True(root.TryGetProperty("meetings", out var meetingsProp));
        Assert.Equal(JsonValueKind.Array, meetingsProp.ValueKind);
        Assert.True(root.TryGetProperty("totalCount", out var totalCountProp));
        Assert.True(totalCountProp.GetInt32() >= 1);
        Assert.True(root.TryGetProperty("activeCount", out _));
        Assert.True(root.TryGetProperty("endedCount", out _));
    }

    [Fact]
    public async Task CloseMeeting_WhenAuthorized_ClosesActiveMeeting()
    {
        await using var factory = CreateFactory();
        var meetingId = Guid.NewGuid();

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.Meetings.Add(new Entities.Meeting
            {
                Id = meetingId,
                MeetingCode = "CLOSE1",
                RoomName = "meeting_CLOSE1",
                Name = "Room To Close",
                CreatedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        }

        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Admin-Key", TestAdminKey);

        using var response = await client.PostAsync("/api/admin/meetings/CLOSE1/close", null);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;

        Assert.True(root.GetProperty("success").GetBoolean());
        Assert.Equal("CLOSE1", root.GetProperty("meetingCode").GetString());

        // Verify in database that endedAt is set
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var meeting = await db.Meetings.FindAsync(meetingId);
            Assert.NotNull(meeting);
            Assert.NotNull(meeting.EndedAt);
        }
    }

    [Fact]
    public async Task CloseMeeting_WhenNotFound_Returns404ProblemDetails()
    {
        await using var factory = CreateFactory();
        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Admin-Key", TestAdminKey);

        using var response = await client.PostAsync("/api/admin/meetings/NONEXIST/close", null);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
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
