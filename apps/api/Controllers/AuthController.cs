using System.Net.Mail;
using AITranslateMeeting.Api.DTOs;
using Microsoft.AspNetCore.Mvc;

namespace AITranslateMeeting.Api.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController : ControllerBase
{
    private static readonly HashSet<string> DefaultDisposableDomains = new(
        [
            "10minutemail.com",
            "guerrillamail.com",
            "mailinator.com",
            "tempmail.com",
            "yopmail.com"
        ],
        StringComparer.OrdinalIgnoreCase);

    private readonly IConfiguration _configuration;

    public AuthController(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    [HttpGet("providers")]
    [ProducesResponseType(typeof(IReadOnlyList<SsoProviderDto>), StatusCodes.Status200OK)]
    public ActionResult<IReadOnlyList<SsoProviderDto>> GetProviders()
    {
        SsoProviderDto[] providers =
        [
            BuildProvider("Google", "google", "Google Workspace", "google"),
            BuildProvider("Microsoft365", "microsoft365", "Microsoft 365", "microsoft")
        ];

        return Ok(providers);
    }

    [HttpPost("validate-domain")]
    [ProducesResponseType(typeof(ValidateDomainResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    public ActionResult<ValidateDomainResponse> ValidateDomain(
        [FromBody] ValidateDomainRequest? request)
    {
        if (!TryGetEmailDomain(request?.Email, out var domain))
        {
            var problem = new ValidationProblemDetails(new Dictionary<string, string[]>
            {
                ["email"] = ["A valid corporate email address is required."]
            })
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "One or more validation errors occurred.",
                Detail = "The supplied email address is invalid."
            };

            return BadRequest(problem);
        }

        var domainFiltering = _configuration.GetValue<bool>("Sso:DomainFiltering:Enabled");
        var allowedPatterns = _configuration
            .GetSection("Sso:DomainFiltering:AllowedDomains")
            .Get<string[]>() ?? [];
        var matchedPattern = allowedPatterns
            .Select(NormalizeDomainPattern)
            .FirstOrDefault(pattern => pattern is not null && DomainMatches(domain, pattern));

        var blockedDomains = new HashSet<string>(DefaultDisposableDomains, StringComparer.OrdinalIgnoreCase);
        foreach (var configuredDomain in _configuration
                     .GetSection("Sso:DomainFiltering:BlockedDomains")
                     .Get<string[]>() ?? [])
        {
            var normalizedDomain = NormalizeDomainPattern(configuredDomain);
            if (normalizedDomain is not null)
            {
                blockedDomains.Add(normalizedDomain.TrimStart('*', '.'));
            }
        }

        var isBlocked = blockedDomains.Any(blocked =>
            domain.Equals(blocked, StringComparison.OrdinalIgnoreCase)
            || domain.EndsWith($".{blocked}", StringComparison.OrdinalIgnoreCase));
        var allowed = !domainFiltering || (!isBlocked && matchedPattern is not null);
        var organizationName = allowed ? ResolveOrganizationName(domain, matchedPattern) : null;

        return Ok(new ValidateDomainResponse(allowed, domain, organizationName));
    }

    private SsoProviderDto BuildProvider(
        string configurationKey,
        string id,
        string name,
        string icon)
    {
        var sectionPath = $"Sso:Providers:{configurationKey}";
        var authUrl = NormalizeAuthUrl(_configuration[$"{sectionPath}:AuthUrl"]);
        var enabled = _configuration.GetValue<bool>($"{sectionPath}:Enabled")
            && authUrl is not null;

        return new SsoProviderDto(id, name, icon, enabled, enabled ? authUrl : null);
    }

    private string? ResolveOrganizationName(string domain, string? matchedPattern)
    {
        var organizationNames = _configuration
            .GetSection("Sso:DomainFiltering:OrganizationNames")
            .GetChildren();

        var organization = organizationNames.FirstOrDefault(item =>
            (!string.IsNullOrWhiteSpace(matchedPattern)
             && item.Key.Equals(matchedPattern, StringComparison.OrdinalIgnoreCase))
            || DomainMatches(domain, item.Key));

        return string.IsNullOrWhiteSpace(organization?.Value)
            ? null
            : organization.Value.Trim();
    }

    private static string? NormalizeAuthUrl(string? value)
    {
        if (!Uri.TryCreate(value, UriKind.Absolute, out var uri))
        {
            return null;
        }

        var isSecure = uri.Scheme.Equals(Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase);
        var isLocalDevelopment = uri.IsLoopback
            && uri.Scheme.Equals(Uri.UriSchemeHttp, StringComparison.OrdinalIgnoreCase);

        return isSecure || isLocalDevelopment ? uri.AbsoluteUri : null;
    }

    private static bool TryGetEmailDomain(string? email, out string domain)
    {
        domain = string.Empty;
        if (string.IsNullOrWhiteSpace(email) || email.Length > 254)
        {
            return false;
        }

        var normalizedEmail = email.Trim();
        try
        {
            var address = new MailAddress(normalizedEmail);
            if (!address.Address.Equals(normalizedEmail, StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            domain = address.Host.Trim().TrimEnd('.').ToLowerInvariant();
            return domain.Contains('.', StringComparison.Ordinal)
                && Uri.CheckHostName(domain) == UriHostNameType.Dns;
        }
        catch (FormatException)
        {
            return false;
        }
    }

    private static string? NormalizeDomainPattern(string? pattern)
    {
        if (string.IsNullOrWhiteSpace(pattern))
        {
            return null;
        }

        var normalized = pattern.Trim().TrimEnd('.').ToLowerInvariant();
        var host = normalized.StartsWith("*.", StringComparison.Ordinal)
            ? normalized[2..]
            : normalized;

        return host.Contains('.', StringComparison.Ordinal)
            && Uri.CheckHostName(host) == UriHostNameType.Dns
            ? normalized
            : null;
    }

    private static bool DomainMatches(string domain, string? pattern)
    {
        if (string.IsNullOrWhiteSpace(pattern))
        {
            return false;
        }

        var normalizedPattern = NormalizeDomainPattern(pattern);
        if (normalizedPattern is null)
        {
            return false;
        }

        if (!normalizedPattern.StartsWith("*.", StringComparison.Ordinal))
        {
            return domain.Equals(normalizedPattern, StringComparison.OrdinalIgnoreCase);
        }

        var suffix = normalizedPattern[1..];
        return domain.Length > suffix.Length
            && domain.EndsWith(suffix, StringComparison.OrdinalIgnoreCase);
    }
}
