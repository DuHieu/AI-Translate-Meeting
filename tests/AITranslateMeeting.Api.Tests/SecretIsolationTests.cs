using AITranslateMeeting.Api.Security;
using Xunit;

namespace AITranslateMeeting.Api.Tests;

public class SecretIsolationTests
{
    private const string StrongKey1 = "abcde12345_AABBCCDDEEFF_1122334455_X1";
    private const string StrongKey2 = "zxcvb67890_GGHHIIJJKKLL_6677889900_X2";
    private const string StrongKey3 = "poiuy98765_MMNNOOPPQQRR_5544332211_X3";
    private const string StrongKey4 = "lkjhg54321_SSTTUUVVWWXX_9988776655_X4";

    [Fact]
    public void ValidateProductionSecrets_Succeeds_WhenAllSecretsAreDistinctAndStrong()
    {
        // Act & Assert (should not throw)
        SecuritySecretValidator.ValidateProductionSecrets(StrongKey1, StrongKey2, StrongKey3, StrongKey4);
    }

    [Fact]
    public void ValidateProductionSecrets_Throws_WhenAnySecretIsTooShort()
    {
        var shortKey = "too_short_key_12345";
        var ex = Assert.Throws<InvalidOperationException>(() =>
            SecuritySecretValidator.ValidateProductionSecrets(shortKey, StrongKey2, StrongKey3, StrongKey4));

        Assert.Contains("LiveKit:ApiSecret", ex.Message);
        Assert.DoesNotContain(shortKey, ex.Message);
    }

    [Theory]
    [InlineData("devsecret_aitranslate_meeting_secret_key_32chars")]
    [InlineData("devkey_123456789012345678901234567890")]
    [InlineData("change-me_123456789012345678901234567890")]
    [InlineData("placeholder_123456789012345678901234567890")]
    public void ValidateProductionSecrets_Throws_WhenSecretIsKnownPlaceholder(string placeholder)
    {
        var ex = Assert.Throws<InvalidOperationException>(() =>
            SecuritySecretValidator.ValidateProductionSecrets(placeholder, StrongKey2, StrongKey3, StrongKey4));

        Assert.Contains("placeholder", ex.Message, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain(placeholder, ex.Message);
    }

    [Fact]
    public void ValidateProductionSecrets_Throws_WhenAdmissionAndSubtitleSecretsAreIdentical()
    {
        var ex = Assert.Throws<InvalidOperationException>(() =>
            SecuritySecretValidator.ValidateProductionSecrets(StrongKey1, StrongKey2, StrongKey2, StrongKey4));

        Assert.Contains("SubtitleToken:SigningKey", ex.Message);
        Assert.Contains("AdmissionToken:SigningKey", ex.Message);
        Assert.DoesNotContain(StrongKey2, ex.Message);
    }

    [Fact]
    public void ValidateProductionSecrets_Throws_WhenLiveKitAndSessionSecretsAreIdentical()
    {
        var ex = Assert.Throws<InvalidOperationException>(() =>
            SecuritySecretValidator.ValidateProductionSecrets(StrongKey1, StrongKey2, StrongKey3, StrongKey1));

        Assert.Contains("LiveKit:ApiSecret", ex.Message);
        Assert.Contains("SessionToken:SigningKey", ex.Message);
        Assert.DoesNotContain(StrongKey1, ex.Message);
    }
}
