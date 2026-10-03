using System.ComponentModel.DataAnnotations;

namespace AITranslateMeeting.Api.Options;

public sealed class AdmissionTokenOptions
{
    public const string SectionName = "AdmissionToken";

    [Required]
    public string Issuer { get; set; } = "ai-translate-meeting-api";

    [Required]
    public string Audience { get; set; } = "ai-translate-meeting-web";

    [Required, MinLength(32)]
    public string SigningKey { get; set; } = string.Empty;

    [Range(5, 1440)]
    public int HostTokenTtlMinutes { get; set; } = 240;

    [Range(1, 60)]
    public int InviteTokenTtlMinutes { get; set; } = 15;

    [Range(1, 60)]
    public int RequestTokenTtlMinutes { get; set; } = 15;
}
