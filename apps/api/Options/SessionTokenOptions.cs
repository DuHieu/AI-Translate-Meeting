using System.ComponentModel.DataAnnotations;

namespace AITranslateMeeting.Api.Options;

public sealed class SessionTokenOptions
{
    public const string SectionName = "SessionToken";

    [Required]
    public string Issuer { get; set; } = "ai-translate-meeting-api";

    [Required]
    public string Audience { get; set; } = "ai-translate-meeting-web";

    [Required, MinLength(32)]
    public string SigningKey { get; set; } = string.Empty;

    [Range(5, 720)]
    public int TokenTtlMinutes { get; set; } = 60;
}
