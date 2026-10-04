using AITranslateMeeting.Api.Controllers;
using AITranslateMeeting.Api.DTOs;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace AITranslateMeeting.Api.Tests;

public sealed class AuthControllerTests
{
    [Fact]
    public void GetProviders_WithDefaultConfiguration_ReturnsDisabledEnterpriseProviders()
    {
        var controller = CreateController();

        var result = controller.GetProviders();

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status200OK, ok.StatusCode);
        var providers = Assert.IsAssignableFrom<IReadOnlyList<SsoProviderDto>>(ok.Value);
        Assert.Collection(
            providers,
            google =>
            {
                Assert.Equal("google", google.Id);
                Assert.Equal("Google Workspace", google.Name);
                Assert.Equal("google", google.Icon);
                Assert.False(google.Enabled);
                Assert.Null(google.AuthUrl);
            },
            microsoft =>
            {
                Assert.Equal("microsoft365", microsoft.Id);
                Assert.Equal("Microsoft 365", microsoft.Name);
                Assert.Equal("microsoft", microsoft.Icon);
                Assert.False(microsoft.Enabled);
                Assert.Null(microsoft.AuthUrl);
            });
    }

    [Fact]
    public void GetProviders_WithValidConfiguration_EnablesConfiguredProvider()
    {
        var controller = CreateController(new Dictionary<string, string?>
        {
            ["Sso:Providers:Google:Enabled"] = "true",
            ["Sso:Providers:Google:AuthUrl"] = "https://accounts.example.com/oauth/google",
            ["Sso:Providers:Microsoft365:Enabled"] = "true",
            ["Sso:Providers:Microsoft365:AuthUrl"] = "not-a-valid-url"
        });

        var result = controller.GetProviders();

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var providers = Assert.IsAssignableFrom<IReadOnlyList<SsoProviderDto>>(ok.Value);
        Assert.True(providers[0].Enabled);
        Assert.Equal("https://accounts.example.com/oauth/google", providers[0].AuthUrl);
        Assert.False(providers[1].Enabled);
        Assert.Null(providers[1].AuthUrl);
    }

    [Fact]
    public void ValidateDomain_WhenFilteringDisabled_AllowsValidEmail()
    {
        var controller = CreateController();

        var result = controller.ValidateDomain(new ValidateDomainRequest("Person@Example.COM"));

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status200OK, ok.StatusCode);
        var response = Assert.IsType<ValidateDomainResponse>(ok.Value);
        Assert.True(response.Allowed);
        Assert.Equal("example.com", response.Domain);
        Assert.Null(response.OrganizationName);
    }

    [Fact]
    public void ValidateDomain_WhenDomainIsAllowlisted_ReturnsOrganization()
    {
        var controller = CreateController(new Dictionary<string, string?>
        {
            ["Sso:DomainFiltering:Enabled"] = "true",
            ["Sso:DomainFiltering:AllowedDomains:0"] = "acme.example",
            ["Sso:DomainFiltering:OrganizationNames:acme.example"] = "Acme Corporation"
        });

        var result = controller.ValidateDomain(new ValidateDomainRequest("employee@acme.example"));

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var response = Assert.IsType<ValidateDomainResponse>(ok.Value);
        Assert.True(response.Allowed);
        Assert.Equal("acme.example", response.Domain);
        Assert.Equal("Acme Corporation", response.OrganizationName);
    }

    [Theory]
    [InlineData("employee@unauthorized.example", "unauthorized.example")]
    [InlineData("employee@mailinator.com", "mailinator.com")]
    public void ValidateDomain_WhenFilteringEnabled_RejectsUnauthorizedOrDisposableDomain(
        string email,
        string expectedDomain)
    {
        var controller = CreateController(new Dictionary<string, string?>
        {
            ["Sso:DomainFiltering:Enabled"] = "true",
            ["Sso:DomainFiltering:AllowedDomains:0"] = "acme.example"
        });

        var result = controller.ValidateDomain(new ValidateDomainRequest(email));

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var response = Assert.IsType<ValidateDomainResponse>(ok.Value);
        Assert.False(response.Allowed);
        Assert.Equal(expectedDomain, response.Domain);
        Assert.Null(response.OrganizationName);
    }

    [Fact]
    public void ValidateDomain_WithInvalidEmail_ReturnsValidationProblem()
    {
        var controller = CreateController();

        var result = controller.ValidateDomain(new ValidateDomainRequest("invalid-email"));

        var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status400BadRequest, badRequest.StatusCode);
        var problem = Assert.IsType<ValidationProblemDetails>(badRequest.Value);
        Assert.Equal(StatusCodes.Status400BadRequest, problem.Status);
        Assert.Contains("email", problem.Errors.Keys, StringComparer.OrdinalIgnoreCase);
    }

    [Fact]
    public void ValidateDomain_WithEmailLongerThan254Characters_ReturnsValidationProblem()
    {
        var controller = CreateController();
        var email = $"{new string('a', 244)}@example.com";

        var result = controller.ValidateDomain(new ValidateDomainRequest(email));

        var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
        var problem = Assert.IsType<ValidationProblemDetails>(badRequest.Value);
        Assert.Equal(StatusCodes.Status400BadRequest, problem.Status);
    }

    private static AuthController CreateController(
        Dictionary<string, string?>? settings = null)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(settings ?? new Dictionary<string, string?>())
            .Build();

        return new AuthController(configuration);
    }
}
