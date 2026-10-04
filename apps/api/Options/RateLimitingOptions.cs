namespace AITranslateMeeting.Api.Options;

public sealed class RateLimitingOptions
{
    public const string SectionName = "RateLimiting";

    public bool Enabled { get; set; } = true;
    public int Multiplier { get; set; } = 1;
    public Dictionary<string, int> PolicyLimits { get; set; } = new(StringComparer.OrdinalIgnoreCase);
}
