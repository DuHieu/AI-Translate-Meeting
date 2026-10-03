using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using AITranslateMeeting.Api.Options;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace AITranslateMeeting.Api.Services;

public interface ISubtitleTokenService
{
    string GenerateAccessToken(Guid meetingId, Guid participantId);
    string GenerateAccessToken(
        Guid meetingId,
        Guid participantId,
        string? participantName,
        string? sourceLanguage,
        string? targetLanguage);
    string GenerateAccessToken(
        Guid meetingId,
        Guid participantId,
        string? participantName,
        string? sourceLanguage,
        string? targetLanguage,
        string? liveKitIdentity);
}

public sealed class SubtitleTokenService : ISubtitleTokenService
{
    public const string WriteScope = "subtitle:write";

    private readonly SubtitleTokenOptions _options;

    public SubtitleTokenService(IOptions<SubtitleTokenOptions> options)
    {
        _options = options.Value;
    }

    public string GenerateAccessToken(Guid meetingId, Guid participantId)
    {
        return GenerateAccessToken(meetingId, participantId, null, null, null, null);
    }

    public string GenerateAccessToken(
        Guid meetingId,
        Guid participantId,
        string? participantName,
        string? sourceLanguage,
        string? targetLanguage)
    {
        return GenerateAccessToken(
            meetingId,
            participantId,
            participantName,
            sourceLanguage,
            targetLanguage,
            null);
    }

    public string GenerateAccessToken(
        Guid meetingId,
        Guid participantId,
        string? participantName,
        string? sourceLanguage,
        string? targetLanguage,
        string? liveKitIdentity)
    {
        if (meetingId == Guid.Empty)
            throw new ArgumentException("Meeting ID cannot be empty.", nameof(meetingId));

        if (participantId == Guid.Empty)
            throw new ArgumentException("Participant ID cannot be empty.", nameof(participantId));

        var now = DateTime.UtcNow;
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, participantId.ToString()),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new("meetingId", meetingId.ToString()),
            new("participantId", participantId.ToString()),
            new("scope", WriteScope)
        };

        if (!string.IsNullOrWhiteSpace(participantName))
        {
            claims.Add(new("participantName", participantName));
            claims.Add(new("displayName", participantName));
        }

        if (!string.IsNullOrWhiteSpace(sourceLanguage))
        {
            claims.Add(new("sourceLanguage", sourceLanguage));
        }

        if (!string.IsNullOrWhiteSpace(targetLanguage))
        {
            claims.Add(new("targetLanguage", targetLanguage));
        }

        if (!string.IsNullOrWhiteSpace(liveKitIdentity))
        {
            claims.Add(new("liveKitIdentity", liveKitIdentity));
        }

        var descriptor = new SecurityTokenDescriptor
        {
            Issuer = _options.Issuer,
            Audience = _options.Audience,
            Subject = new ClaimsIdentity(claims),
            NotBefore = now,
            Expires = now.AddMinutes(_options.TokenTtlMinutes),
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.SigningKey)),
                SecurityAlgorithms.HmacSha256Signature)
        };

        var handler = new JwtSecurityTokenHandler();
        return handler.WriteToken(handler.CreateToken(descriptor));
    }
}
