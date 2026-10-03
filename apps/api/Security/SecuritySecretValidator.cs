namespace AITranslateMeeting.Api.Security;

public static class SecuritySecretValidator
{
    private static readonly string[] PlaceholderSubstrings =
    [
        "devsecret",
        "devkey",
        "secret_key_32chars",
        "change-me",
        "changeme",
        "placeholder",
        "your-secret",
        "example",
        "testsecret",
        "default"
    ];

    public static bool IsPlaceholder(string? secret)
    {
        if (string.IsNullOrWhiteSpace(secret))
            return true;

        var trimmed = secret.Trim();
        if (trimmed.Length < 32)
            return true;

        foreach (var placeholder in PlaceholderSubstrings)
        {
            if (trimmed.Contains(placeholder, StringComparison.OrdinalIgnoreCase))
                return true;
        }

        if (trimmed.All(c => c == trimmed[0]))
            return true;

        return false;
    }

    public static void ValidateProductionSecrets(
        string? liveKitSecret,
        string? subtitleSigningKey,
        string? admissionSigningKey,
        string? sessionSigningKey)
    {
        var secrets = new Dictionary<string, string?>
        {
            ["LiveKit:ApiSecret"] = liveKitSecret,
            ["SubtitleToken:SigningKey"] = subtitleSigningKey,
            ["AdmissionToken:SigningKey"] = admissionSigningKey,
            ["SessionToken:SigningKey"] = sessionSigningKey
        };

        foreach (var (name, value) in secrets)
        {
            if (string.IsNullOrWhiteSpace(value) || value.Trim().Length < 32)
            {
                throw new InvalidOperationException(
                    $"Production secret validation failed: '{name}' is missing or shorter than the required minimum 32 characters.");
            }

            if (IsPlaceholder(value))
            {
                throw new InvalidOperationException(
                    $"Production secret validation failed: '{name}' contains a known insecure dev/placeholder value and must be rotated.");
            }
        }

        var entries = secrets.ToList();
        for (int i = 0; i < entries.Count; i++)
        {
            for (int j = i + 1; j < entries.Count; j++)
            {
                if (string.Equals(entries[i].Value?.Trim(), entries[j].Value?.Trim(), StringComparison.Ordinal))
                {
                    throw new InvalidOperationException(
                        $"Production secret validation failed: '{entries[i].Key}' and '{entries[j].Key}' must use separate, distinct signing secrets for proper security isolation.");
                }
            }
        }
    }
}
