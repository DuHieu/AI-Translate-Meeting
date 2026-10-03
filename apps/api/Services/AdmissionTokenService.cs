using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using AITranslateMeeting.Api.Exceptions;
using AITranslateMeeting.Api.Options;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace AITranslateMeeting.Api.Services;

public static class AdmissionTokenScopes
{
    public const string Host = "meeting:host";
    public const string Join = "meeting:join";
    public const string Poll = "admission:poll";
}

public sealed record AdmissionTokenClaims(
    Guid MeetingId,
    Guid? AdmissionId,
    string Role,
    string Scope,
    DateTime ExpiresAt);

public interface IAdmissionTokenService
{
    string GenerateHostToken(Guid meetingId);
    string GenerateInviteToken(Guid meetingId, Guid admissionId, DateTime expiresAt);
    string GenerateRequestToken(Guid meetingId, Guid admissionId, DateTime expiresAt);
    AdmissionTokenClaims ValidateToken(string token);
}

public sealed class AdmissionTokenService : IAdmissionTokenService
{
    private const string TokenType = "admission+jwt";
    private readonly AdmissionTokenOptions _options;
    private readonly TimeProvider _timeProvider;
    private readonly JwtSecurityTokenHandler _handler = new() { MapInboundClaims = false };

    public AdmissionTokenService(IOptions<AdmissionTokenOptions> options, TimeProvider timeProvider)
    {
        _options = options.Value;
        _timeProvider = timeProvider;
    }

    public string GenerateHostToken(Guid meetingId)
    {
        var expiresAt = UtcNow().AddMinutes(_options.HostTokenTtlMinutes);
        return GenerateToken(meetingId, null, "host", AdmissionTokenScopes.Host, expiresAt);
    }

    public string GenerateInviteToken(Guid meetingId, Guid admissionId, DateTime expiresAt) =>
        GenerateToken(meetingId, admissionId, "participant", AdmissionTokenScopes.Join, expiresAt);

    public string GenerateRequestToken(Guid meetingId, Guid admissionId, DateTime expiresAt) =>
        GenerateToken(meetingId, admissionId, "participant", AdmissionTokenScopes.Poll, expiresAt);

    public AdmissionTokenClaims ValidateToken(string token)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            throw Unauthorized("admission_token_missing", "Admission token is required.");
        }

        try
        {
            var principal = _handler.ValidateToken(token, CreateValidationParameters(), out var validatedToken);
            if (validatedToken is not JwtSecurityToken jwt
                || !string.Equals(jwt.Header.Alg, SecurityAlgorithms.HmacSha256, StringComparison.Ordinal))
            {
                throw Unauthorized("admission_token_invalid", "Admission token is invalid.");
            }

            var meetingId = ReadGuid(principal, "meetingId");
            var admissionIdValue = principal.FindFirstValue(JwtRegisteredClaimNames.Jti);
            var admissionId = Guid.TryParse(admissionIdValue, out var parsedAdmissionId)
                ? parsedAdmissionId
                : (Guid?)null;
            var role = principal.FindFirstValue("role") ?? string.Empty;
            var scope = principal.FindFirstValue("scope") ?? string.Empty;
            var expiresAt = jwt.ValidTo;

            if (meetingId == Guid.Empty || string.IsNullOrWhiteSpace(role) || string.IsNullOrWhiteSpace(scope))
            {
                throw Unauthorized("admission_token_invalid", "Admission token is invalid.");
            }

            return new AdmissionTokenClaims(meetingId, admissionId, role, scope, expiresAt);
        }
        catch (SecurityTokenExpiredException)
        {
            throw Unauthorized("admission_token_expired", "Admission token has expired.");
        }
        catch (AdmissionException)
        {
            throw;
        }
        catch (Exception ex) when (ex is SecurityTokenException or ArgumentException)
        {
            throw Unauthorized("admission_token_invalid", "Admission token is invalid.");
        }
    }

    private string GenerateToken(
        Guid meetingId,
        Guid? admissionId,
        string role,
        string scope,
        DateTime expiresAt)
    {
        var now = UtcNow();
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, role == "host" ? $"host:{meetingId}" : $"admission:{admissionId}"),
            new("meetingId", meetingId.ToString()),
            new("role", role),
            new("scope", scope)
        };

        if (admissionId.HasValue)
        {
            claims.Add(new Claim(JwtRegisteredClaimNames.Jti, admissionId.Value.ToString()));
        }

        var descriptor = new SecurityTokenDescriptor
        {
            TokenType = TokenType,
            Issuer = _options.Issuer,
            Audience = _options.Audience,
            Subject = new ClaimsIdentity(claims),
            NotBefore = now.AddSeconds(-5),
            Expires = DateTime.SpecifyKind(expiresAt, DateTimeKind.Utc),
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.SigningKey)),
                SecurityAlgorithms.HmacSha256)
        };

        return _handler.WriteToken(_handler.CreateToken(descriptor));
    }

    private TokenValidationParameters CreateValidationParameters() => new()
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.SigningKey)),
        ValidateIssuer = true,
        ValidIssuer = _options.Issuer,
        ValidateAudience = true,
        ValidAudience = _options.Audience,
        RequireExpirationTime = true,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.FromSeconds(15),
        ValidAlgorithms = [SecurityAlgorithms.HmacSha256],
        ValidTypes = [TokenType],
        LifetimeValidator = (notBefore, expires, _, _) =>
        {
            var now = UtcNow();
            if (!expires.HasValue || expires.Value <= now.AddSeconds(-15))
            {
                throw new SecurityTokenExpiredException();
            }

            if (notBefore.HasValue && notBefore.Value > now.AddSeconds(15))
            {
                throw new SecurityTokenNotYetValidException();
            }

            return true;
        }
    };

    private static Guid ReadGuid(ClaimsPrincipal principal, string claimType) =>
        Guid.TryParse(principal.FindFirstValue(claimType), out var value) ? value : Guid.Empty;

    private DateTime UtcNow() => _timeProvider.GetUtcNow().UtcDateTime;

    private static AdmissionException Unauthorized(string code, string detail) =>
        new(StatusCodes.Status401Unauthorized, code, "Admission denied", detail);
}
