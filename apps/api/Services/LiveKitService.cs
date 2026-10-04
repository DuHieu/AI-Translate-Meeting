using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using AITranslateMeeting.Api.Options;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace AITranslateMeeting.Api.Services;

public interface ILiveKitService
{
    string GenerateAccessToken(string roomName, string identity, string displayName);
    string GetPublicUrl();
}

public class LiveKitService : ILiveKitService
{
    private readonly LiveKitOptions _options;
    private readonly IHttpContextAccessor? _httpContextAccessor;

    public LiveKitService(IOptions<LiveKitOptions> options, IHttpContextAccessor? httpContextAccessor = null)
    {
        _options = options.Value;
        _httpContextAccessor = httpContextAccessor;
    }

    public string GetPublicUrl()
    {
        // 1. If explicit non-localhost public URL is configured in options/environment, use it
        if (!string.IsNullOrWhiteSpace(_options.PublicUrl) &&
            !_options.PublicUrl.Contains("127.0.0.1") &&
            !_options.PublicUrl.Contains("localhost"))
        {
            return _options.PublicUrl;
        }

        // 2. If running behind a reverse proxy or public domain, dynamically resolve from incoming request
        var httpContext = _httpContextAccessor?.HttpContext;
        if (httpContext != null)
        {
            var host = httpContext.Request.Headers["X-Forwarded-Host"].FirstOrDefault()
                ?? httpContext.Request.Host.Value;
            var proto = httpContext.Request.Headers["X-Forwarded-Proto"].FirstOrDefault()
                ?? httpContext.Request.Scheme;

            if (!string.IsNullOrWhiteSpace(host) &&
                !host.Contains("localhost", StringComparison.OrdinalIgnoreCase) &&
                !host.Contains("127.0.0.1"))
            {
                var scheme = proto.Equals("https", StringComparison.OrdinalIgnoreCase) ? "wss" : "ws";
                return $"{scheme}://{host}";
            }
        }

        return _options.PublicUrl;
    }

    public string GenerateAccessToken(string roomName, string identity, string displayName)
    {
        if (string.IsNullOrWhiteSpace(roomName))
            throw new ArgumentException("Room name cannot be empty", nameof(roomName));

        if (string.IsNullOrWhiteSpace(identity))
            throw new ArgumentException("Participant identity cannot be empty", nameof(identity));

        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.UTF8.GetBytes(_options.ApiSecret);

        var videoGrants = new Dictionary<string, object>
        {
            { "room", roomName },
            { "roomJoin", true },
            { "canPublish", true },
            { "canSubscribe", true },
            { "canPublishData", true },
            { "canPublishSources", new[] { "camera", "microphone", "screen_share", "screen_share_audio" } }
        };

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, identity),
            new(JwtRegisteredClaimNames.Name, displayName ?? identity),
            new(JwtRegisteredClaimNames.Iss, _options.ApiKey),
            new("video", System.Text.Json.JsonSerializer.Serialize(videoGrants), JsonClaimValueTypes.Json)
        };

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddMinutes(_options.TokenTtlMinutes),
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }
}
