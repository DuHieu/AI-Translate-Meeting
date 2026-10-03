using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace AITranslateMeeting.Api.Tests;

public sealed class SecurityHeadersTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public SecurityHeadersTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Response_ContainsRequiredSecurityHeaders()
    {
        using var client = _factory.WithWebHostBuilder(builder =>
        {
            builder.UseSetting("ConnectionStrings:DefaultConnection", "Host=localhost;Database=test;Username=test;Password=test");
            builder.UseSetting("Cors:AllowedOrigins:0", "http://localhost:3000");
            builder.UseSetting("LiveKit:InternalUrl", "http://localhost:7880");
            builder.UseSetting("LiveKit:PublicUrl", "ws://localhost:7880");
            builder.UseSetting("LiveKit:ApiKey", "test-key");
            builder.UseSetting("LiveKit:ApiSecret", new string('x', 32));
            builder.UseSetting("SubtitleToken:SigningKey", new string('s', 32));
            builder.UseSetting("AdmissionToken:SigningKey", new string('a', 32));
            builder.UseSetting("SessionToken:SigningKey", new string('b', 32));
        }).CreateClient();

        using var response = await client.GetAsync("/health");

        Assert.True(response.Headers.Contains("X-Content-Type-Options"), "Missing X-Content-Type-Options");
        Assert.Equal("nosniff", response.Headers.GetValues("X-Content-Type-Options").First());

        Assert.True(response.Headers.Contains("X-Frame-Options"), "Missing X-Frame-Options");
        Assert.Equal("DENY", response.Headers.GetValues("X-Frame-Options").First());

        Assert.True(response.Headers.Contains("Referrer-Policy"), "Missing Referrer-Policy");
        Assert.Equal("strict-origin-when-cross-origin", response.Headers.GetValues("Referrer-Policy").First());

        Assert.True(response.Headers.Contains("Content-Security-Policy"), "Missing Content-Security-Policy");
        var csp = response.Headers.GetValues("Content-Security-Policy").First();
        Assert.Contains("frame-ancestors 'none'", csp);
    }

    [Fact]
    public async Task Production_Response_ContainsHstsHeader()
    {
        using var client = _factory.WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Production");
            builder.UseSetting("Security:EnforceProductionSecrets", "false");
            builder.UseSetting("ConnectionStrings:DefaultConnection", "Host=localhost;Database=test;Username=test;Password=test");
            builder.UseSetting("Cors:AllowedOrigins:0", "http://localhost:3000");
            builder.UseSetting("LiveKit:InternalUrl", "http://localhost:7880");
            builder.UseSetting("LiveKit:PublicUrl", "ws://localhost:7880");
            builder.UseSetting("LiveKit:ApiKey", "prod-key");
            builder.UseSetting("LiveKit:ApiSecret", "k9Fw3Pz8Qv7Xy2Bm4Jn5Lt1Rs6Hd0CgE9");
            builder.UseSetting("SubtitleToken:SigningKey", "m2Vp7Lq9Wx4Jy1Rn3Kb5Ts8Df0Hg6CzB9");
            builder.UseSetting("AdmissionToken:SigningKey", "t5Nx8Jw2Qv9Ly4Bm1Kn7Ps3Rf0Hg6DzC9");
            builder.UseSetting("SessionToken:SigningKey", "y8Bp3Vw1Qz7Lx4Nm2Kn9Ts5Rf0Hg6JzD9");
        }).CreateClient();

        using var response = await client.GetAsync("/health");

        Assert.True(response.Headers.Contains("Strict-Transport-Security"), "Missing HSTS in production");
        var hsts = response.Headers.GetValues("Strict-Transport-Security").First();
        Assert.Contains("max-age=31536000", hsts);
        Assert.Contains("includeSubDomains", hsts);
    }
}
