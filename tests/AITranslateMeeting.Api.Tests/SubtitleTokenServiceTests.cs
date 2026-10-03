using System.IdentityModel.Tokens.Jwt;
using System.Text;
using AITranslateMeeting.Api.Options;
using AITranslateMeeting.Api.Services;
using Microsoft.IdentityModel.Tokens;
using Xunit;

namespace AITranslateMeeting.Api.Tests;

public sealed class SubtitleTokenServiceTests
{
    [Fact]
    public void GenerateAccessToken_BindsMeetingParticipantAndWriteScope()
    {
        var options = Microsoft.Extensions.Options.Options.Create(new SubtitleTokenOptions
        {
            Issuer = "ai-translate-meeting-api",
            Audience = "ai-translate-meeting-ai-service",
            SigningKey = new string('s', 32),
            TokenTtlMinutes = 10
        });
        var service = new SubtitleTokenService(options);
        var meetingId = Guid.NewGuid();
        var participantId = Guid.NewGuid();

        var token = service.GenerateAccessToken(meetingId, participantId);
        var handler = new JwtSecurityTokenHandler();
        handler.ValidateToken(
            token,
            new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(new string('s', 32))),
                ValidateIssuer = true,
                ValidIssuer = "ai-translate-meeting-api",
                ValidateAudience = true,
                ValidAudience = "ai-translate-meeting-ai-service",
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero
            },
            out var validatedToken);
        var jwt = Assert.IsType<JwtSecurityToken>(validatedToken);

        Assert.Equal("ai-translate-meeting-api", jwt.Issuer);
        Assert.Contains("ai-translate-meeting-ai-service", jwt.Audiences);
        Assert.Equal(participantId.ToString(), jwt.Subject);
        Assert.Equal(meetingId.ToString(), jwt.Claims.Single(c => c.Type == "meetingId").Value);
        Assert.Equal(participantId.ToString(), jwt.Claims.Single(c => c.Type == "participantId").Value);
        Assert.Equal("subtitle:write", jwt.Claims.Single(c => c.Type == "scope").Value);
        Assert.InRange(jwt.ValidTo - jwt.ValidFrom, TimeSpan.FromMinutes(9), TimeSpan.FromMinutes(10));
    }

    [Fact]
    public void GenerateAccessToken_WithFullParticipantClaims_BindsAllRequiredClaims()
    {
        var options = Microsoft.Extensions.Options.Options.Create(new SubtitleTokenOptions
        {
            Issuer = "ai-translate-meeting-api",
            Audience = "ai-translate-meeting-ai-service",
            SigningKey = new string('k', 32),
            TokenTtlMinutes = 15
        });
        var service = new SubtitleTokenService(options);
        var meetingId = Guid.NewGuid();
        var participantId = Guid.NewGuid();
        const string participantName = "Nguyen Van A";
        const string sourceLanguage = "vi";
        const string targetLanguage = "ja";
        const string liveKitIdentity = "p_0123456789abcdef";

        var token = service.GenerateAccessToken(
            meetingId,
            participantId,
            participantName,
            sourceLanguage,
            targetLanguage,
            liveKitIdentity);
        var handler = new JwtSecurityTokenHandler();
        handler.ValidateToken(
            token,
            new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(new string('k', 32))),
                ValidateIssuer = true,
                ValidIssuer = "ai-translate-meeting-api",
                ValidateAudience = true,
                ValidAudience = "ai-translate-meeting-ai-service",
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero
            },
            out var validatedToken);
        var jwt = Assert.IsType<JwtSecurityToken>(validatedToken);

        Assert.Equal("ai-translate-meeting-api", jwt.Issuer);
        Assert.Contains("ai-translate-meeting-ai-service", jwt.Audiences);
        Assert.Equal(participantId.ToString(), jwt.Subject);
        Assert.Equal(meetingId.ToString(), jwt.Claims.Single(c => c.Type == "meetingId").Value);
        Assert.Equal(participantId.ToString(), jwt.Claims.Single(c => c.Type == "participantId").Value);
        Assert.Equal(participantName, jwt.Claims.Single(c => c.Type == "participantName").Value);
        Assert.Equal(participantName, jwt.Claims.Single(c => c.Type == "displayName").Value);
        Assert.Equal(sourceLanguage, jwt.Claims.Single(c => c.Type == "sourceLanguage").Value);
        Assert.Equal(targetLanguage, jwt.Claims.Single(c => c.Type == "targetLanguage").Value);
        Assert.Equal(liveKitIdentity, jwt.Claims.Single(c => c.Type == "liveKitIdentity").Value);
        Assert.Equal("subtitle:write", jwt.Claims.Single(c => c.Type == "scope").Value);
        Assert.False(string.IsNullOrWhiteSpace(jwt.Id));
    }

    [Fact]
    public void GenerateAccessToken_TwoDifferentParticipants_GeneratesDistinctIdentitiesAndJtis()
    {
        var options = Microsoft.Extensions.Options.Options.Create(new SubtitleTokenOptions
        {
            Issuer = "ai-translate-meeting-api",
            Audience = "ai-translate-meeting-ai-service",
            SigningKey = new string('k', 32),
            TokenTtlMinutes = 15
        });
        var service = new SubtitleTokenService(options);
        var meetingId = Guid.NewGuid();
        var participantId1 = Guid.NewGuid();
        var participantId2 = Guid.NewGuid();

        var token1 = service.GenerateAccessToken(meetingId, participantId1, "Speaker 1", "vi", "en");
        var token2 = service.GenerateAccessToken(meetingId, participantId2, "Speaker 2", "ja", "en");

        var handler = new JwtSecurityTokenHandler();
        var jwt1 = handler.ReadJwtToken(token1);
        var jwt2 = handler.ReadJwtToken(token2);

        Assert.NotEqual(jwt1.Subject, jwt2.Subject);
        Assert.NotEqual(jwt1.Id, jwt2.Id);
        Assert.Equal("Speaker 1", jwt1.Claims.Single(c => c.Type == "participantName").Value);
        Assert.Equal("Speaker 2", jwt2.Claims.Single(c => c.Type == "participantName").Value);
        Assert.Equal(meetingId.ToString(), jwt1.Claims.Single(c => c.Type == "meetingId").Value);
        Assert.Equal(meetingId.ToString(), jwt2.Claims.Single(c => c.Type == "meetingId").Value);
    }
}
