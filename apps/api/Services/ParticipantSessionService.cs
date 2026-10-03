using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using AITranslateMeeting.Api.Data;
using AITranslateMeeting.Api.Entities;
using AITranslateMeeting.Api.Exceptions;
using AITranslateMeeting.Api.Options;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace AITranslateMeeting.Api.Services;

public static class SessionScopes
{
    public const string Read = "meeting:read";
    public const string Leave = "meeting:leave";
    public const string Host = "meeting:host";
}

public sealed record SessionTokenClaims(
    Guid MeetingId,
    Guid ParticipantId,
    string Role,
    IReadOnlySet<string> Scopes,
    Guid Jti,
    DateTime ExpiresAt);

public interface IParticipantSessionService
{
    Task<string> GenerateSessionTokenAsync(
        Meeting meeting,
        MeetingParticipant participant,
        string role,
        IEnumerable<string> scopes,
        CancellationToken ct = default);

    Task<SessionTokenClaims> ValidateSessionTokenAsync(
        string token,
        string? requiredScope = null,
        Guid? expectedMeetingId = null,
        CancellationToken ct = default);

    Task RevokeSessionAsync(Guid jti, CancellationToken ct = default);
    Task RevokeParticipantSessionsAsync(Guid meetingId, Guid participantId, CancellationToken ct = default);
    Task<int> CleanupExpiredSessionsAsync(TimeSpan olderThan, CancellationToken ct = default);
}

public sealed class ParticipantSessionService : IParticipantSessionService
{
    private const string TokenType = "session+jwt";
    private readonly AppDbContext _context;
    private readonly SessionTokenOptions _options;
    private readonly TimeProvider _timeProvider;
    private readonly JwtSecurityTokenHandler _handler = new() { MapInboundClaims = false };

    public ParticipantSessionService(
        AppDbContext context,
        IOptions<SessionTokenOptions> options,
        TimeProvider timeProvider)
    {
        _context = context;
        _options = options.Value;
        _timeProvider = timeProvider;
    }

    public async Task<string> GenerateSessionTokenAsync(
        Meeting meeting,
        MeetingParticipant participant,
        string role,
        IEnumerable<string> scopes,
        CancellationToken ct = default)
    {
        var jti = Guid.NewGuid();
        var now = UtcNow();
        var expiresAt = now.AddMinutes(_options.TokenTtlMinutes);
        var scopeString = string.Join(" ", scopes.Where(s => !string.IsNullOrWhiteSpace(s)));

        var session = new ParticipantSession
        {
            Id = Guid.NewGuid(),
            MeetingId = meeting.Id,
            ParticipantId = participant.Id,
            Jti = jti,
            Role = role,
            Scopes = scopeString,
            CreatedAt = now,
            ExpiresAt = expiresAt,
            RevokedAt = null
        };

        _context.ParticipantSessions.Add(session);
        await _context.SaveChangesAsync(ct);

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.SigningKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new("meetingId", meeting.Id.ToString()),
            new("participantId", participant.Id.ToString()),
            new("role", role),
            new("scope", scopeString),
            new(JwtRegisteredClaimNames.Jti, jti.ToString())
        };

        var descriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Issuer = _options.Issuer,
            Audience = _options.Audience,
            NotBefore = now.AddSeconds(-30),
            Expires = expiresAt,
            SigningCredentials = credentials,
            TokenType = TokenType
        };

        var token = _handler.CreateToken(descriptor);
        return _handler.WriteToken(token);
    }

    public async Task<SessionTokenClaims> ValidateSessionTokenAsync(
        string token,
        string? requiredScope = null,
        Guid? expectedMeetingId = null,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            throw Unauthorized("session_token_missing", "Session token is required.");
        }

        ClaimsPrincipal principal;
        JwtSecurityToken jwt;

        try
        {
            principal = _handler.ValidateToken(token, CreateValidationParameters(), out var validatedToken);
            if (validatedToken is not JwtSecurityToken parsedJwt
                || !string.Equals(parsedJwt.Header.Alg, SecurityAlgorithms.HmacSha256, StringComparison.Ordinal))
            {
                throw Unauthorized("session_token_invalid", "Session token is invalid.");
            }
            jwt = parsedJwt;
        }
        catch (SecurityTokenExpiredException)
        {
            throw Unauthorized("session_token_expired", "Session token has expired.");
        }
        catch (AdmissionException)
        {
            throw;
        }
        catch (Exception ex) when (ex is SecurityTokenException or ArgumentException)
        {
            throw Unauthorized("session_token_invalid", "Session token is invalid.");
        }

        var meetingIdStr = principal.FindFirstValue("meetingId");
        if (!Guid.TryParse(meetingIdStr, out var meetingId) || meetingId == Guid.Empty)
        {
            throw Unauthorized("session_token_invalid", "Session token has invalid meeting binding.");
        }

        var participantIdStr = principal.FindFirstValue("participantId");
        if (!Guid.TryParse(participantIdStr, out var participantId) || participantId == Guid.Empty)
        {
            throw Unauthorized("session_token_invalid", "Session token has invalid participant binding.");
        }

        var jtiStr = principal.FindFirstValue(JwtRegisteredClaimNames.Jti);
        if (!Guid.TryParse(jtiStr, out var jti) || jti == Guid.Empty)
        {
            throw Unauthorized("session_token_invalid", "Session token has invalid identifier.");
        }

        var role = principal.FindFirstValue("role") ?? string.Empty;
        var scopeStr = principal.FindFirstValue("scope") ?? string.Empty;
        var scopes = scopeStr
            .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var expiresAt = jwt.ValidTo;

        if (expectedMeetingId.HasValue && expectedMeetingId.Value != meetingId)
        {
            throw Forbidden("session_cross_room", "Session token is not valid for this meeting room.");
        }

        if (!string.IsNullOrWhiteSpace(requiredScope) && !scopes.Contains(requiredScope))
        {
            throw Forbidden("session_scope_insufficient", $"Session token lacks the required '{requiredScope}' scope.");
        }

        // Verify session state in database
        var session = await _context.ParticipantSessions
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Jti == jti && s.MeetingId == meetingId, ct);

        if (session == null)
        {
            throw Unauthorized("session_not_found", "Session record was not found or has been revoked.");
        }

        if (session.RevokedAt != null)
        {
            throw Unauthorized("session_token_revoked", "Session token has been revoked.");
        }

        if (session.ExpiresAt <= UtcNow())
        {
            throw Unauthorized("session_token_expired", "Session token has expired.");
        }

        return new SessionTokenClaims(meetingId, participantId, role, scopes, jti, expiresAt);
    }

    public async Task RevokeSessionAsync(Guid jti, CancellationToken ct = default)
    {
        var now = UtcNow();
        var session = await _context.ParticipantSessions.FirstOrDefaultAsync(s => s.Jti == jti, ct);
        if (session != null && session.RevokedAt == null)
        {
            session.RevokedAt = now;
            await _context.SaveChangesAsync(ct);
        }
    }

    public async Task RevokeParticipantSessionsAsync(Guid meetingId, Guid participantId, CancellationToken ct = default)
    {
        var now = UtcNow();
        var sessions = await _context.ParticipantSessions
            .Where(s => s.MeetingId == meetingId && s.ParticipantId == participantId && s.RevokedAt == null)
            .ToListAsync(ct);

        foreach (var session in sessions)
        {
            session.RevokedAt = now;
        }

        if (sessions.Count > 0)
        {
            await _context.SaveChangesAsync(ct);
        }
    }

    public async Task<int> CleanupExpiredSessionsAsync(TimeSpan olderThan, CancellationToken ct = default)
    {
        var cutoff = UtcNow().Subtract(olderThan);
        var expired = await _context.ParticipantSessions
            .Where(s => s.ExpiresAt < cutoff || (s.RevokedAt != null && s.RevokedAt < cutoff))
            .ToListAsync(ct);

        if (expired.Count > 0)
        {
            _context.ParticipantSessions.RemoveRange(expired);
            return await _context.SaveChangesAsync(ct);
        }

        return 0;
    }

    private TokenValidationParameters CreateValidationParameters() => new()
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.SigningKey)),
        ValidateIssuer = true,
        ValidIssuer = _options.Issuer,
        ValidateAudience = true,
        ValidAudience = _options.Audience,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.FromSeconds(30)
    };

    private DateTime UtcNow() => _timeProvider.GetUtcNow().UtcDateTime;

    private static AdmissionException Unauthorized(string code, string detail) =>
        new(StatusCodes.Status401Unauthorized, code, detail);

    private static AdmissionException Forbidden(string code, string detail) =>
        new(StatusCodes.Status403Forbidden, code, detail);
}
