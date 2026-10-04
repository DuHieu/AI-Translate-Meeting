using System.Net;
using System.Text.Json;
using AITranslateMeeting.Api.Data;
using AITranslateMeeting.Api.Entities;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using AITranslateMeeting.Api.Services;
using Xunit;

namespace AITranslateMeeting.Api.Tests;

public sealed class SystemControllerTests
{
    [Fact]
    public async Task GetBranding_ReturnsDefaultBrandingConfigurationAsJson()
    {
        await using var factory = CreateFactory("pilot");
        using var client = factory.CreateClient();

        using var response = await client.GetAsync("/api/system/branding");
        var body = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("application/json", response.Content.Headers.ContentType?.MediaType);

        using var doc = JsonDocument.Parse(body);
        var branding = doc.RootElement;

        Assert.Equal("ViMeet", branding.GetProperty("brandName").GetString());
        Assert.Equal(
            "Nền tảng họp trực tuyến thông minh song ngữ",
            branding.GetProperty("slogan").GetString());
        Assert.Equal(JsonValueKind.Null, branding.GetProperty("logoUrl").ValueKind);
        Assert.Equal("#0284c7", branding.GetProperty("primaryColor").GetString());
        Assert.Equal("© ViMeet", branding.GetProperty("copyrightText").GetString());
    }

    [Fact]
    public async Task GetStatus_ReturnsSanitizedSystemOverviewWithZeroSecrets()
    {
        await using var factory = CreateFactory("pilot");
        using var client = factory.CreateClient();

        using var response = await client.GetAsync("/api/system/status");
        var body = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;

        Assert.Equal("AI Translate Meeting (Private Bilingual Workspace)", root.GetProperty("productName").GetString());
        Assert.Equal("1.2.0", root.GetProperty("version").GetString());
        Assert.Equal("pilot", root.GetProperty("deploymentProfile").GetString());
        Assert.True(root.GetProperty("security").GetProperty("zeroRawAudioPolicy").GetBoolean());

        // Zero Secrets verification: MUST NOT contain passwords or signing keys
        Assert.DoesNotContain("secret-pass", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("signing-key", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("ApiSecret", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("Host=127.0.0.1", body, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task GetStatus_ReflectsConfiguredBusinessProfile()
    {
        await using var factory = CreateFactory("business");
        using var client = factory.CreateClient();

        using var response = await client.GetAsync("/api/system/status");
        var body = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var doc = JsonDocument.Parse(body);
        Assert.Equal("business", doc.RootElement.GetProperty("deploymentProfile").GetString());
    }

    [Fact]
    public async Task GetStatus_ReturnsSupportedGlossaryDomainsAndPrivacyContract()
    {
        await using var factory = CreateFactory("pilot");
        using var client = factory.CreateClient();

        using var response = await client.GetAsync("/api/system/status");
        var body = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;

        Assert.True(root.TryGetProperty("supportedGlossaryDomains", out var domains));
        Assert.True(domains.GetArrayLength() >= 3);

        Assert.True(root.TryGetProperty("privacy", out var privacy));
        Assert.True(privacy.GetProperty("zeroRawAudioPolicy").GetBoolean());
        Assert.True(privacy.GetProperty("ephemeralAudioOnly").GetBoolean());
        Assert.True(privacy.GetProperty("localModelTranscription").GetBoolean());
        Assert.True(privacy.GetProperty("retentionAutoPurge").GetBoolean());
    }

    [Fact]
    public async Task TriggerCleanup_PurgesExpiredRecordsAndReturnsCounts()
    {
        await using var factory = CreateFactory("pilot");
        
        // Seed expired records into the in-memory database
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var meeting = new Meeting
            {
                Id = Guid.NewGuid(),
                MeetingCode = "CLN999999",
                RoomName = "room-cleanup",
                Name = "Retention Test Meeting",
                CreatedAt = DateTime.UtcNow.AddDays(-3)
            };
            db.Meetings.Add(meeting);

            // Expired 30 hours ago (beyond default 24h retention)
            db.MeetingAdmissions.Add(new MeetingAdmission
            {
                Id = Guid.NewGuid(),
                MeetingId = meeting.Id,
                Type = "invite",
                Status = "expired",
                Role = "participant",
                CreatedAt = DateTime.UtcNow.AddHours(-35),
                ExpiresAt = DateTime.UtcNow.AddHours(-30)
            });

            await db.SaveChangesAsync();
        }

        using var client = factory.CreateClient();
        using var response = await client.PostAsync("/api/system/cleanup", null);
        var body = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;

        Assert.True(root.TryGetProperty("deletedAdmissions", out var deletedAdmissions));
        Assert.True(deletedAdmissions.GetInt32() >= 1);
        Assert.True(root.TryGetProperty("deletedSessions", out _));
        Assert.True(root.TryGetProperty("cutoffUtc", out _));
        Assert.True(root.TryGetProperty("purgedAtUtc", out _));
    }

    [Fact]
    public async Task GetStatus_ReturnsRequireHostAuthenticationSecurityFlag()
    {
        await using var factory = CreateFactory("pilot");
        using var client = factory.CreateClient();

        using var response = await client.GetAsync("/api/system/status");
        var body = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;

        Assert.True(root.GetProperty("security").TryGetProperty("requireHostAuthentication", out var flag));
        Assert.False(flag.GetBoolean());
    }

    [Fact]
    public async Task GetAudit_ReturnsRecentAuditEventsSanitized()
    {
        await using var factory = CreateFactory("pilot");
        
        using (var scope = factory.Services.CreateScope())
        {
            var auditService = scope.ServiceProvider.GetRequiredService<IAuditLogService>();
            auditService.LogEvent(
                "TestSecurityEvent",
                Guid.NewGuid().ToString(),
                Guid.NewGuid().ToString(),
                "Authorized access Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-ID"
            );
        }

        using var client = factory.CreateClient();
        using var response = await client.GetAsync("/api/system/audit?limit=10");
        var body = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var doc = JsonDocument.Parse(body);
        var array = doc.RootElement;
        Assert.Equal(JsonValueKind.Array, array.ValueKind);
        Assert.True(array.GetArrayLength() >= 1);

        var first = array[0];
        Assert.Equal("TestSecurityEvent", first.GetProperty("eventType").GetString());
        // Verify sanitization: JWT token must be redacted
        Assert.DoesNotContain("eyJhbGci", body);
        Assert.Contains("[REDACTED_JWT]", body);
    }

    [Fact]
    public async Task GetStatus_ReturnsLicenseInformation()
    {
        await using var factory = CreateFactory("pilot");
        using var client = factory.CreateClient();

        using var response = await client.GetAsync("/api/system/status");
        var body = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;

        Assert.True(root.TryGetProperty("license", out var lic));
        Assert.Equal("trial", lic.GetProperty("status").GetString());
        Assert.Equal("pilot", lic.GetProperty("tier").GetString());
        Assert.Equal(1, lic.GetProperty("maxConcurrentRooms").GetInt32());
        Assert.Equal(5, lic.GetProperty("maxParticipantsPerRoom").GetInt32());
    }

    [Fact]
    public async Task GetLicense_ReturnsDirectLicenseEndpoint()
    {
        await using var factory = CreateFactory("pilot");
        using var client = factory.CreateClient();

        using var response = await client.GetAsync("/api/system/license");
        var body = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var doc = JsonDocument.Parse(body);
        var lic = doc.RootElement;

        Assert.Equal("trial", lic.GetProperty("status").GetString());
        Assert.Equal("Community Trial (Unlicensed)", lic.GetProperty("organizationName").GetString());
        Assert.True(lic.GetProperty("allowedFeatures").GetArrayLength() >= 2);
    }

    [Fact]
    public async Task SubmitLead_WithValidPayload_ReturnsOkAndLogsAudit()
    {
        await using var factory = CreateFactory("pilot");
        using var client = factory.CreateClient();

        var request = new
        {
            fullName = "Doanh Nghiep Test",
            email = "contact@corp-test.vn",
            company = "Test Corporation",
            teamSize = "50-200",
            languagePair = "VI-JA",
            deploymentModel = "on-premise",
            notes = "Need air-gapped deployment on Ubuntu 22.04"
        };

        using var content = new StringContent(
            JsonSerializer.Serialize(request),
            System.Text.Encoding.UTF8,
            "application/json");

        using var response = await client.PostAsync("/api/system/lead", content);
        var body = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;

        Assert.True(root.GetProperty("success").GetBoolean());
        Assert.Contains("ghi nhận", root.GetProperty("message").GetString()!);

        // Verify audit event captured
        using var auditResponse = await client.GetAsync("/api/system/audit?limit=10");
        var auditBody = await auditResponse.Content.ReadAsStringAsync();
        Assert.Contains("EnterpriseLeadCaptured", auditBody);
        Assert.Contains("contact@corp-test.vn", auditBody);
    }

    [Fact]
    public async Task SubmitLead_WithMissingEmailOrName_ReturnsBadRequestProblemDetails()
    {
        await using var factory = CreateFactory("pilot");
        using var client = factory.CreateClient();

        var request = new
        {
            fullName = "",
            email = "invalid-email",
            company = "Test Co"
        };

        using var content = new StringContent(
            JsonSerializer.Serialize(request),
            System.Text.Encoding.UTF8,
            "application/json");

        using var response = await client.PostAsync("/api/system/lead", content);
        var body = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);

        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;
        Assert.Equal(400, root.GetProperty("status").GetInt32());
    }

    private static WebApplicationFactory<Program> CreateFactory(string profile)
    {
        return new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Development");
            builder.UseSetting("DEPLOYMENT_PROFILE", profile);
            builder.UseSetting(
                "ConnectionStrings:DefaultConnection",
                "Host=127.0.0.1;Port=5432;Database=test;Username=test;Password=secret-pass;Timeout=1");
            builder.UseSetting("Redis:ConnectionString", string.Empty);
            builder.UseSetting("DatabaseCleanup:Enabled", "true");
            builder.UseSetting("DatabaseCleanup:IntervalHours", "1");
            builder.UseSetting("DatabaseCleanup:RetentionHours", "24");
            builder.UseSetting("Cors:AllowedOrigins:0", "http://localhost:3000");
            builder.UseSetting("LiveKit:InternalUrl", "http://localhost:7880");
            builder.UseSetting("LiveKit:PublicUrl", "ws://localhost:7880");
            builder.UseSetting("LiveKit:ApiKey", "system-test-key-16");
            builder.UseSetting("LiveKit:ApiSecret", "livekit-signing-key-0123456789-abcdef");
            builder.UseSetting("SubtitleToken:SigningKey", "subtitle-signing-key-0123456789-abcdef");
            builder.UseSetting("AdmissionToken:SigningKey", "admission-signing-key-0123456789-abcdef");
            builder.UseSetting("SessionToken:SigningKey", "session-signing-key-0123456789-abcdef");

            var dbName = $"system-{Guid.NewGuid():N}";
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
