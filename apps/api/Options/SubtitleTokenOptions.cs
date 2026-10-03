using System.ComponentModel.DataAnnotations;

namespace AITranslateMeeting.Api.Options;

public sealed class SubtitleTokenOptions
{
    public const string SectionName = "SubtitleToken";

    [Required]
    public string Issuer { get; set; } = "ai-translate-meeting-api";

    [Required]
    public string Audience { get; set; } = "ai-translate-meeting-ai-service";

    [Required, MinLength(32)]
    public string SigningKey { get; set; } = string.Empty;

    [Range(1, 30)]
    public int TokenTtlMinutes { get; set; } = 10;
}
