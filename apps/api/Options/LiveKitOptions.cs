using System.ComponentModel.DataAnnotations;

namespace AITranslateMeeting.Api.Options;

public sealed class LiveKitOptions
{
    public const string SectionName = "LiveKit";

    [Required]
    public string InternalUrl { get; set; } = string.Empty;

    [Required]
    public string PublicUrl { get; set; } = string.Empty;

    [Required, MinLength(3)]
    public string ApiKey { get; set; } = string.Empty;

    [Required, MinLength(32)]
    public string ApiSecret { get; set; } = string.Empty;

    [Range(5, 1440)]
    public int TokenTtlMinutes { get; set; } = 60;
}
