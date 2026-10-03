using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace AITranslateMeeting.Api.Tests;

public sealed class CorsPolicyTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public CorsPolicyTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.WithWebHostBuilder(builder =>
        {
            builder.UseSetting("Cors:AllowedOrigins:0", "https://meeting.example.com");
            builder.UseSetting("ConnectionStrings:DefaultConnection", "Host=localhost;Database=test;Username=test;Password=test");
            builder.UseSetting("LiveKit:InternalUrl", "http://localhost:7880");
            builder.UseSetting("LiveKit:PublicUrl", "ws://localhost:7880");
            builder.UseSetting("LiveKit:ApiKey", "test-key");
            builder.UseSetting("LiveKit:ApiSecret", new string('x', 32));
            builder.UseSetting("LiveKit:TokenTtlMinutes", "60");
            builder.UseSetting("SubtitleToken:SigningKey", new string('s', 32));
            builder.UseSetting("AdmissionToken:SigningKey", new string('a', 32));
            builder.UseSetting("SessionToken:SigningKey", new string('b', 32));
        }).CreateClient();
    }

    [Theory]
    [InlineData("https://meeting.example.com", true)]
    [InlineData("https://malicious.example", false)]
    public async Task CorsPolicy_AllowsOnlyConfiguredOrigins(string origin, bool shouldAllow)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/meetings/UNKNOWN");
        request.Headers.Add("Origin", origin);

        using var response = await _client.SendAsync(request);
        var hasHeader = response.Headers.TryGetValues("Access-Control-Allow-Origin", out var values);

        var isAllowed = hasHeader && values!.Any(value => value is "*" || value == origin);
        Assert.Equal(shouldAllow, isAllowed);
    }
}
