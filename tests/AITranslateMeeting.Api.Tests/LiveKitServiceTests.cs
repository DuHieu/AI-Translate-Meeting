using System.IdentityModel.Tokens.Jwt;
using AITranslateMeeting.Api.Options;
using AITranslateMeeting.Api.Services;
using Microsoft.Extensions.Options;
using Xunit;

namespace AITranslateMeeting.Api.Tests;

public class LiveKitServiceTests
{
    private readonly LiveKitService _liveKitService;
    private readonly LiveKitOptions _options;

    public LiveKitServiceTests()
    {
        _options = new LiveKitOptions
        {
            ApiKey = "devkey",
            ApiSecret = new string('x', 32),
            InternalUrl = "http://livekit:7880",
            PublicUrl = "ws://127.0.0.1:7880",
            TokenTtlMinutes = 60
        };

        _liveKitService = new LiveKitService(Microsoft.Extensions.Options.Options.Create(_options));
    }

    [Fact]
    public void GenerateAccessToken_ReturnsValidJwtRestrictedToRoom()
    {
        // Arrange
        var roomName = "meeting_AB7K29";
        var identity = "p_123456789";
        var displayName = "Hieu";

        // Act
        var tokenString = _liveKitService.GenerateAccessToken(roomName, identity, displayName);

        // Assert
        Assert.NotNull(tokenString);
        Assert.NotEmpty(tokenString);

        var handler = new JwtSecurityTokenHandler();
        var jwt = handler.ReadJwtToken(tokenString);

        Assert.Equal(_options.ApiKey, jwt.Issuer);
        Assert.Equal(identity, jwt.Subject);

        // Verify video claim contains room restriction
        var videoClaim = jwt.Claims.FirstOrDefault(c => c.Type == "video")?.Value;
        Assert.NotNull(videoClaim);
        Assert.Contains(roomName, videoClaim);
        Assert.Contains("canPublish", videoClaim);
        Assert.Contains("canSubscribe", videoClaim);
        Assert.InRange(
            jwt.ValidTo,
            DateTime.UtcNow.AddMinutes(55),
            DateTime.UtcNow.AddMinutes(65));
    }

    [Fact]
    public void GetPublicUrl_ReturnsConfiguredUrl_WhenExplicitNonLocalhost()
    {
        var options = new LiveKitOptions
        {
            ApiKey = "devkey",
            ApiSecret = new string('x', 32),
            InternalUrl = "http://livekit:7880",
            PublicUrl = "wss://livekit.layameet.com",
            TokenTtlMinutes = 60
        };
        var service = new LiveKitService(Microsoft.Extensions.Options.Options.Create(options));

        Assert.Equal("wss://livekit.layameet.com", service.GetPublicUrl());
    }

    [Fact]
    public void GetPublicUrl_ResolvesDynamicallyFromHttpContext_WhenLocalhostDefault()
    {
        var options = new LiveKitOptions
        {
            ApiKey = "devkey",
            ApiSecret = new string('x', 32),
            InternalUrl = "http://livekit:7880",
            PublicUrl = "ws://127.0.0.1:7880",
            TokenTtlMinutes = 60
        };

        var httpContext = new Microsoft.AspNetCore.Http.DefaultHttpContext();
        httpContext.Request.Headers["X-Forwarded-Host"] = "layameet.com";
        httpContext.Request.Headers["X-Forwarded-Proto"] = "https";

        var accessor = new Microsoft.AspNetCore.Http.HttpContextAccessor { HttpContext = httpContext };
        var service = new LiveKitService(Microsoft.Extensions.Options.Options.Create(options), accessor);

        Assert.Equal("wss://layameet.com", service.GetPublicUrl());
    }

    [Fact]
    public void GetPublicUrl_FallsBackToDefault_WhenNoHttpContext()
    {
        var options = new LiveKitOptions
        {
            ApiKey = "devkey",
            ApiSecret = new string('x', 32),
            InternalUrl = "http://livekit:7880",
            PublicUrl = "ws://127.0.0.1:7880",
            TokenTtlMinutes = 60
        };

        var service = new LiveKitService(Microsoft.Extensions.Options.Options.Create(options));
        Assert.Equal("ws://127.0.0.1:7880", service.GetPublicUrl());
    }
}
