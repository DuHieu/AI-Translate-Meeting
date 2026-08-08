namespace AITranslateMeeting.Api.Options;

public sealed class LiveKitOptions
{
    public const string SectionName = "LiveKit";

    public string InternalUrl { get; set; } = "http://livekit:7880";

    public string PublicUrl { get; set; } = "ws://127.0.0.1:7880";

    public string ApiKey { get; set; } = "devkey";

    public string ApiSecret { get; set; } = "devsecret_aitranslate_meeting_secret_key_32chars";
}
