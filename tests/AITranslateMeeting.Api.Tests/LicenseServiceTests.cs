using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using AITranslateMeeting.Api.Options;
using AITranslateMeeting.Api.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit;

namespace AITranslateMeeting.Api.Tests;

public class LicenseServiceTests
{
    private const string TestSigningKey = "master-license-signing-secret-key-32-chars-long!";

    [Fact]
    public void GetCurrentLicense_WhenNoKeyProvided_ReturnsTrialStatusWithPilotLimits()
    {
        var options = Microsoft.Extensions.Options.Options.Create(new LicenseOptions
        {
            LicenseKey = string.Empty,
            SigningKey = TestSigningKey
        });

        var service = new LicenseService(options, NullLogger<LicenseService>.Instance);
        var license = service.GetCurrentLicense();

        Assert.Equal("trial", license.Status);
        Assert.Equal("Community Trial (Unlicensed)", license.OrganizationName);
        Assert.Equal("pilot", license.Tier);
        Assert.Equal(1, license.MaxConcurrentRooms);
        Assert.Equal(5, license.MaxParticipantsPerRoom);
        Assert.Null(license.ExpiresAtUtc);
    }

    [Fact]
    public void GetCurrentLicense_WhenValidLicenseProvided_ReturnsActiveStatusWithLicensedLimits()
    {
        var expiry = DateTime.UtcNow.AddDays(90);
        var token = CreateLicenseToken(
            org: "CMC Japan Software Division",
            tier: "team",
            maxRooms: 3,
            maxParticipants: 15,
            features: ["glossary", "minutes_export"],
            expiresAt: expiry,
            signingKey: TestSigningKey
        );

        var options = Microsoft.Extensions.Options.Options.Create(new LicenseOptions
        {
            LicenseKey = token,
            SigningKey = TestSigningKey
        });

        var service = new LicenseService(options, NullLogger<LicenseService>.Instance);
        var license = service.GetCurrentLicense();

        Assert.Equal("active", license.Status);
        Assert.Equal("CMC Japan Software Division", license.OrganizationName);
        Assert.Equal("team", license.Tier);
        Assert.Equal(3, license.MaxConcurrentRooms);
        Assert.Equal(15, license.MaxParticipantsPerRoom);
        Assert.NotNull(license.ExpiresAtUtc);
        Assert.True(license.DaysRemaining >= 89);
        Assert.True(service.ValidateFeature("glossary"));
        Assert.False(service.ValidateFeature("unknown_feature"));
    }

    [Fact]
    public void GetCurrentLicense_WhenLicenseExpired_ReturnsExpiredStatus()
    {
        var expiry = DateTime.UtcNow.AddDays(-5);
        var token = CreateLicenseToken(
            org: "Expired Client Corp",
            tier: "enterprise",
            maxRooms: 20,
            maxParticipants: 50,
            features: ["glossary"],
            expiresAt: expiry,
            signingKey: TestSigningKey
        );

        var options = Microsoft.Extensions.Options.Options.Create(new LicenseOptions
        {
            LicenseKey = token,
            SigningKey = TestSigningKey
        });

        var service = new LicenseService(options, NullLogger<LicenseService>.Instance);
        var license = service.GetCurrentLicense();

        Assert.Equal("expired", license.Status);
        Assert.Equal("Expired Client Corp", license.OrganizationName);
        Assert.Equal(0, license.DaysRemaining);
    }

    [Fact]
    public void GetCurrentLicense_WhenTamperedOrInvalidSignature_ReturnsInvalidStatusWithSafeFallback()
    {
        var expiry = DateTime.UtcNow.AddDays(30);
        var token = CreateLicenseToken(
            org: "Tampered Corp",
            tier: "enterprise",
            maxRooms: 50,
            maxParticipants: 100,
            features: ["all"],
            expiresAt: expiry,
            signingKey: "wrong-signing-key-00000000000000000000"
        );

        var options = Microsoft.Extensions.Options.Options.Create(new LicenseOptions
        {
            LicenseKey = token,
            SigningKey = TestSigningKey
        });

        var service = new LicenseService(options, NullLogger<LicenseService>.Instance);
        var license = service.GetCurrentLicense();

        Assert.Equal("invalid", license.Status);
        Assert.Equal(1, license.MaxConcurrentRooms); // Safe fallback to 1 room
    }

    [Fact]
    public void CapacityChecks_EnforceRoomAndParticipantLimits()
    {
        var options = Microsoft.Extensions.Options.Options.Create(new LicenseOptions
        {
            LicenseKey = string.Empty, // Trial: 1 room, 5 participants
            SigningKey = TestSigningKey
        });

        var service = new LicenseService(options, NullLogger<LicenseService>.Instance);

        Assert.True(service.CanCreateRoom(activeRoomCount: 0));
        Assert.False(service.CanCreateRoom(activeRoomCount: 1)); // At capacity

        Assert.True(service.CanJoinRoom(currentParticipantCount: 4));
        Assert.False(service.CanJoinRoom(currentParticipantCount: 5)); // At capacity
    }

    [Fact]
    public void GetCurrentLicense_WhenCustomDefaultLimitsConfigured_ReturnsCustomTrialLimits()
    {
        var options = Microsoft.Extensions.Options.Options.Create(new LicenseOptions
        {
            LicenseKey = string.Empty,
            DefaultMaxRooms = 25,
            DefaultMaxParticipants = 20
        });

        var service = new LicenseService(options, NullLogger<LicenseService>.Instance);
        var license = service.GetCurrentLicense();

        Assert.Equal("trial", license.Status);
        Assert.Equal(25, license.MaxConcurrentRooms);
        Assert.Equal(20, license.MaxParticipantsPerRoom);
    }

    public static string CreateLicenseToken(
        string org,
        string tier,
        int maxRooms,
        int maxParticipants,
        string[] features,
        DateTime expiresAt,
        string signingKey)
    {
        var payloadObj = new
        {
            org,
            tier,
            max_rooms = maxRooms,
            max_participants = maxParticipants,
            features,
            exp = new DateTimeOffset(expiresAt).ToUnixTimeSeconds()
        };

        var json = JsonSerializer.Serialize(payloadObj);
        var payloadBytes = Encoding.UTF8.GetBytes(json);
        var payloadB64 = Convert.ToBase64String(payloadBytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');

        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(signingKey));
        var sigBytes = hmac.ComputeHash(Encoding.UTF8.GetBytes(payloadB64));
        var sigB64 = Convert.ToBase64String(sigBytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');

        return $"{payloadB64}.{sigB64}";
    }
}
