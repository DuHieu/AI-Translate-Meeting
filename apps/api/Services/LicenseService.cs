using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using AITranslateMeeting.Api.DTOs;
using AITranslateMeeting.Api.Options;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace AITranslateMeeting.Api.Services;

public interface ILicenseService
{
    SystemLicenseInfoDto GetCurrentLicense();
    bool ValidateFeature(string featureName);
    bool CanCreateRoom(int activeRoomCount);
    bool CanJoinRoom(int currentParticipantCount);
}

public sealed class LicenseService : ILicenseService
{
    private static readonly string[] DefaultTrialFeatures = ["glossary", "minutes_export"];
    private readonly LicenseOptions _options;
    private readonly ILogger<LicenseService> _logger;
    private readonly Lazy<SystemLicenseInfoDto> _cachedLicense;

    public LicenseService(IOptions<LicenseOptions> options, ILogger<LicenseService> logger)
    {
        _options = options.Value;
        _logger = logger;
        _cachedLicense = new Lazy<SystemLicenseInfoDto>(EvaluateLicense);
    }

    public SystemLicenseInfoDto GetCurrentLicense() => _cachedLicense.Value;

    public bool ValidateFeature(string featureName)
    {
        var license = GetCurrentLicense();
        return license.AllowedFeatures.Contains(featureName, StringComparer.OrdinalIgnoreCase);
    }

    public bool CanCreateRoom(int activeRoomCount)
    {
        var license = GetCurrentLicense();
        return activeRoomCount < license.MaxConcurrentRooms;
    }

    public bool CanJoinRoom(int currentParticipantCount)
    {
        var license = GetCurrentLicense();
        return currentParticipantCount < license.MaxParticipantsPerRoom;
    }

    private SystemLicenseInfoDto EvaluateLicense()
    {
        if (string.IsNullOrWhiteSpace(_options.LicenseKey))
        {
            _logger.LogInformation("No commercial license key configured. Defaulting to Community Trial mode.");
            return new SystemLicenseInfoDto(
                Status: "trial",
                OrganizationName: "Community Trial (Unlicensed)",
                Tier: "pilot",
                MaxConcurrentRooms: 1,
                MaxParticipantsPerRoom: 5,
                AllowedFeatures: DefaultTrialFeatures,
                ExpiresAtUtc: null,
                DaysRemaining: null
            );
        }

        var parts = _options.LicenseKey.Trim().Split('.');
        if (parts.Length != 2)
        {
            _logger.LogWarning("Configured LICENSE_KEY has invalid token format.");
            return CreateInvalidLicenseFallback();
        }

        var payloadB64 = parts[0];
        var sigB64 = parts[1];

        // Verify cryptographic signature if signing key is configured
        if (!string.IsNullOrWhiteSpace(_options.SigningKey))
        {
            try
            {
                using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_options.SigningKey));
                var computedSig = hmac.ComputeHash(Encoding.UTF8.GetBytes(payloadB64));
                var computedSigB64 = Convert.ToBase64String(computedSig).TrimEnd('=').Replace('+', '-').Replace('/', '_');

                var expectedBytes = Encoding.UTF8.GetBytes(computedSigB64);
                var actualBytes = Encoding.UTF8.GetBytes(sigB64);

                if (expectedBytes.Length != actualBytes.Length ||
                    !CryptographicOperations.FixedTimeEquals(expectedBytes, actualBytes))
                {
                    _logger.LogWarning("LICENSE_KEY cryptographic signature verification failed.");
                    return CreateInvalidLicenseFallback();
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error verifying LICENSE_KEY cryptographic signature.");
                return CreateInvalidLicenseFallback();
            }
        }

        // Parse payload
        try
        {
            var padded = payloadB64.Replace('-', '+').Replace('_', '/');
            switch (padded.Length % 4)
            {
                case 2: padded += "=="; break;
                case 3: padded += "="; break;
            }

            var json = Encoding.UTF8.GetString(Convert.FromBase64String(padded));
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            var org = root.TryGetProperty("org", out var orgProp) ? orgProp.GetString() ?? "Unknown" : "Licensed Customer";
            var tier = root.TryGetProperty("tier", out var tierProp) ? tierProp.GetString() ?? "pilot" : "pilot";
            var maxRooms = root.TryGetProperty("max_rooms", out var mrProp) ? mrProp.GetInt32() : 1;
            var maxParticipants = root.TryGetProperty("max_participants", out var mpProp) ? mpProp.GetInt32() : 5;
            var expSec = root.TryGetProperty("exp", out var expProp) ? expProp.GetInt64() : 0;

            var features = new List<string>();
            if (root.TryGetProperty("features", out var featProp) && featProp.ValueKind == JsonValueKind.Array)
            {
                foreach (var el in featProp.EnumerateArray())
                {
                    var f = el.GetString();
                    if (!string.IsNullOrWhiteSpace(f)) features.Add(f);
                }
            }
            if (features.Count == 0) features.AddRange(DefaultTrialFeatures);

            var expiresAtUtc = expSec > 0 ? DateTimeOffset.FromUnixTimeSeconds(expSec).UtcDateTime : (DateTime?)null;
            var now = DateTime.UtcNow;

            if (expiresAtUtc.HasValue && expiresAtUtc.Value < now)
            {
                _logger.LogWarning("Commercial license for organization '{Org}' expired on {Expiry}.", org, expiresAtUtc.Value);
                return new SystemLicenseInfoDto(
                    Status: "expired",
                    OrganizationName: org,
                    Tier: tier.ToLowerInvariant(),
                    MaxConcurrentRooms: 1,
                    MaxParticipantsPerRoom: 5,
                    AllowedFeatures: DefaultTrialFeatures,
                    ExpiresAtUtc: expiresAtUtc,
                    DaysRemaining: 0
                );
            }

            var daysRemaining = expiresAtUtc.HasValue ? (int)Math.Max(0, (expiresAtUtc.Value - now).TotalDays) : (int?)null;
            _logger.LogInformation("Loaded valid commercial license for organization '{Org}' (Tier: {Tier}, Expires: {Expiry}).",
                org, tier, expiresAtUtc?.ToString("yyyy-MM-dd") ?? "never");

            return new SystemLicenseInfoDto(
                Status: "active",
                OrganizationName: org,
                Tier: tier.ToLowerInvariant(),
                MaxConcurrentRooms: maxRooms,
                MaxParticipantsPerRoom: maxParticipants,
                AllowedFeatures: features.ToArray(),
                ExpiresAtUtc: expiresAtUtc,
                DaysRemaining: daysRemaining
            );
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to decode LICENSE_KEY payload.");
            return CreateInvalidLicenseFallback();
        }
    }

    private static SystemLicenseInfoDto CreateInvalidLicenseFallback() =>
        new(
            Status: "invalid",
            OrganizationName: "Invalid License (Fallback Mode)",
            Tier: "pilot",
            MaxConcurrentRooms: 1,
            MaxParticipantsPerRoom: 5,
            AllowedFeatures: DefaultTrialFeatures,
            ExpiresAtUtc: null,
            DaysRemaining: null
        );
}
