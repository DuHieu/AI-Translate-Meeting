namespace AITranslateMeeting.Api.Options;

public sealed class LicenseOptions
{
    public const string SectionName = "License";

    public string LicenseKey { get; set; } = string.Empty;
    public string SigningKey { get; set; } = string.Empty;
    public int? DefaultMaxRooms { get; set; }
    public int? DefaultMaxParticipants { get; set; }
}
