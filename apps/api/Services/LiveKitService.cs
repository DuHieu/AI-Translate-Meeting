using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using AITranslateMeeting.Api.Options;
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

    public LiveKitService(IOptions<LiveKitOptions> options)
    {
        _options = options.Value;
    }

    public string GetPublicUrl() => _options.PublicUrl;

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
            Expires = DateTime.UtcNow.AddHours(24),
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }
}
