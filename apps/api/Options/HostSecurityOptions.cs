namespace AITranslateMeeting.Api.Options;

public sealed class HostSecurityOptions
{
    public const string SectionName = "HostSecurity";

    public bool RequireHostAuthentication { get; set; } = false;
    public string HostKey { get; set; } = string.Empty;
}
