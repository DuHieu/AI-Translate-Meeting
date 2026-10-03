namespace AITranslateMeeting.Api.Services;

public interface ITranslationGateway
{
    Task<string> TranslateAsync(string text, string sourceLanguage, string targetLanguage, CancellationToken ct = default);
}

public class TranslationGateway : ITranslationGateway
{
    private readonly ILogger<TranslationGateway> _logger;

    public TranslationGateway(ILogger<TranslationGateway> logger)
    {
        _logger = logger;
    }

    public Task<string> TranslateAsync(string text, string sourceLanguage, string targetLanguage, CancellationToken ct = default)
    {
        _logger.LogInformation("Translating via gateway: {Source} -> {Target} | length: {Length}", sourceLanguage, targetLanguage, text?.Length ?? 0);
        return Task.FromResult($"[{targetLanguage.ToUpper()}] {text}");
    }
}
