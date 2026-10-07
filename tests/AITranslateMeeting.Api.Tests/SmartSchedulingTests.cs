using AITranslateMeeting.Api.Data;
using AITranslateMeeting.Api.DTOs;
using AITranslateMeeting.Api.Options;
using AITranslateMeeting.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace AITranslateMeeting.Api.Tests;

public sealed class SmartSchedulingTests : IDisposable
{
    private readonly AppDbContext _dbContext;
    private readonly MutableTimeProvider _timeProvider;
    private readonly MeetingService _service;

    public SmartSchedulingTests()
    {
        var dbOptions = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _dbContext = new AppDbContext(dbOptions);
        _timeProvider = new MutableTimeProvider(new DateTimeOffset(2026, 10, 6, 1, 0, 0, TimeSpan.Zero));

        var liveKit = new Mock<ILiveKitService>();
        liveKit.Setup(service => service.GenerateAccessToken(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>()))
            .Returns("LIVEKIT_TOKEN");
        liveKit.Setup(service => service.GetPublicUrl()).Returns("wss://livekit.layameet.com");

        var subtitle = new Mock<ISubtitleTokenService>();
        subtitle.Setup(service => service.GenerateAccessToken(
                It.IsAny<Guid>(),
                It.IsAny<Guid>(),
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<string?>()))
            .Returns("SUBTITLE_TOKEN");

        var admissionOptions = Microsoft.Extensions.Options.Options.Create(new AdmissionTokenOptions
        {
            Issuer = "scheduling-tests",
            Audience = "scheduling-tests-web",
            SigningKey = "test-only-admission-signing-key-with-at-least-32-characters",
            HostTokenTtlMinutes = 240,
            InviteTokenTtlMinutes = 15,
            RequestTokenTtlMinutes = 15
        });
        var admissionTokens = new AdmissionTokenService(admissionOptions, _timeProvider);

        var sessionOptions = Microsoft.Extensions.Options.Options.Create(new SessionTokenOptions
        {
            Issuer = "scheduling-tests",
            Audience = "scheduling-tests-web",
            SigningKey = "test-only-session-signing-key-with-at-least-32-characters",
            TokenTtlMinutes = 60
        });
        var sessionService = new ParticipantSessionService(_dbContext, sessionOptions, _timeProvider);

        _service = new MeetingService(
            _dbContext,
            liveKit.Object,
            subtitle.Object,
            admissionTokens,
            sessionService,
            _timeProvider,
            Mock.Of<ILogger<MeetingService>>(),
            admissionOptions);
    }

    [Fact]
    public async Task CreateMeeting_WithSchedule_PersistsUtcWindowAndBriefingDefaults()
    {
        var localStart = new DateTime(2026, 10, 10, 9, 30, 0, DateTimeKind.Local);

        var created = await _service.CreateMeetingAsync(new CreateMeetingRequestDto(
            "Vietnam Japan Planning",
            localStart,
            60,
            HostEmail: " HOST@example.com "));

        Assert.Equal(localStart.ToUniversalTime(), created.ScheduledStartAt);
        Assert.Equal(localStart.ToUniversalTime().AddMinutes(60), created.ScheduledEndAt);
        Assert.Equal("Asia/Ho_Chi_Minh", created.Timezone);
        Assert.Equal("vi", created.DefaultSpokenLanguage);
        Assert.Equal("ja", created.DefaultTargetLanguage);
        Assert.Equal("general", created.DomainGlossary);

        var persisted = await _dbContext.Meetings.SingleAsync(meeting => meeting.Id == created.MeetingId);
        Assert.Equal("host@example.com", persisted.HostEmail);
    }

    [Fact]
    public async Task GetMeetingSchedule_ReturnsCountsAndNewestRsvpFirstWithoutEmail()
    {
        var created = await CreateScheduledMeetingAsync("Schedule lookup");
        await _service.SubmitRsvpAsync(created.MeetingCode, new SubmitRsvpRequestDto(
            "Anh", "anh@example.com", "going", "vi", "ja"));
        _timeProvider.Advance(TimeSpan.FromMinutes(1));
        await _service.SubmitRsvpAsync(created.MeetingCode, new SubmitRsvpRequestDto(
            "Yuki", "yuki@example.com", "maybe", "ja", "vi"));
        _timeProvider.Advance(TimeSpan.FromMinutes(1));
        await _service.SubmitRsvpAsync(created.MeetingCode, new SubmitRsvpRequestDto(
            "John", null, "declined", "en", "vi"));

        var schedule = await _service.GetMeetingScheduleAsync(created.MeetingCode);

        Assert.Equal(1, schedule.GoingCount);
        Assert.Equal(1, schedule.MaybeCount);
        Assert.Equal(1, schedule.DeclinedCount);
        Assert.Equal(["John", "Yuki", "Anh"], schedule.Attendees.Select(item => item.DisplayName));
        Assert.DoesNotContain(
            schedule.Attendees.GetType().GetGenericArguments()[0].GetProperties(),
            property => property.Name == "Email");
    }

    [Fact]
    public async Task SubmitRsvp_WithEmail_UpdatesExistingRsvpAndApprovedTokenBypassesWaitingRoom()
    {
        var created = await CreateScheduledMeetingAsync("Partner call");
        await _service.SubmitRsvpAsync(created.MeetingCode, new SubmitRsvpRequestDto(
            "Old name", " partner@example.com ", "declined", "en", "vi"));

        var rsvp = await _service.SubmitRsvpAsync(created.MeetingCode, new SubmitRsvpRequestDto(
            "Tanaka", "PARTNER@example.com", "going", "auto", "vi"));

        Assert.NotNull(rsvp.PreApprovedAdmissionToken);
        Assert.NotNull(rsvp.AdmissionExpiresAt);
        Assert.Equal(1, await _dbContext.MeetingRsvps.CountAsync());

        var joined = Assert.IsType<JoinMeetingResponseDto>(await _service.JoinMeetingAsync(
            created.MeetingCode,
            new JoinMeetingRequestDto(
                rsvp.DisplayName,
                rsvp.SpokenLanguage,
                rsvp.TargetLanguage,
                rsvp.PreApprovedAdmissionToken)));

        Assert.Equal("participant", joined.Role);
        Assert.Equal("Tanaka", joined.DisplayName);
        Assert.Empty(await _service.GetAdmissionsAsync(created.MeetingCode, created.HostToken));
    }

    [Fact]
    public async Task SubmitRsvp_RejectsBlankSpokenLanguage()
    {
        var created = await CreateScheduledMeetingAsync("Invalid language");

        await Assert.ThrowsAsync<ArgumentException>(() => _service.SubmitRsvpAsync(
            created.MeetingCode,
            new SubmitRsvpRequestDto("Guest", null, "going", "", "ja")));
    }

    [Fact]
    public async Task GetUpcomingScheduledMeetings_FiltersByHostOrRsvpEmail()
    {
        var hosted = await CreateScheduledMeetingAsync("Hosted", "owner@example.com", 4);
        var attending = await CreateScheduledMeetingAsync("Attending", "other@example.com", 5);
        await _service.SubmitRsvpAsync(attending.MeetingCode, new SubmitRsvpRequestDto(
            "Owner", "OWNER@example.com", "maybe", "vi", "ja"));
        await CreateScheduledMeetingAsync("Outside window", "owner@example.com", -3);

        var upcoming = await _service.GetUpcomingScheduledMeetingsAsync(" owner@example.com ");

        Assert.Equal([hosted.MeetingCode, attending.MeetingCode], upcoming.Select(item => item.MeetingCode));
    }

    [Fact]
    public async Task GenerateCalendarIcs_ContainsUtcEventJoinLinkAndTwoAlarms()
    {
        var start = new DateTime(2026, 10, 10, 2, 30, 0, DateTimeKind.Utc);
        var created = await _service.CreateMeetingAsync(new CreateMeetingRequestDto(
            "Vietnam, Japan Sync",
            start,
            45,
            Agenda: "Review roadmap; agree next steps",
            DefaultSpokenLanguage: "vi",
            DefaultTargetLanguage: "ja"));

        var content = await _service.GenerateCalendarIcsAsync(created.MeetingCode);
        var unfoldedContent = content.Replace("\r\n ", string.Empty, StringComparison.Ordinal);

        Assert.Contains("BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//LayaMeet//Bilingual AI Meeting//EN", content);
        Assert.Contains("DTSTART:20261010T023000Z", content);
        Assert.Contains("DTEND:20261010T031500Z", content);
        Assert.Contains("SUMMARY:Vietnam\\, Japan Sync", content);
        Assert.Contains("Language Pair: vi -> ja", unfoldedContent);
        Assert.Contains($"https://layameet.com/meeting/{created.MeetingCode}", unfoldedContent);
        Assert.Equal(2, CountOccurrences(content, "BEGIN:VALARM"));
        Assert.Contains("TRIGGER:-PT15M", content);
        Assert.Contains("TRIGGER:-PT5M", content);
        Assert.EndsWith("END:VCALENDAR\r\n", content);
    }

    [Fact]
    public void AppDbContextModelSnapshot_MatchesCurrentEfModel()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql("Host=localhost;Database=model-check;Username=model-check;Password=model-check")
            .Options;
        using var relationalContext = new AppDbContext(options);
        var snapshotType = typeof(AppDbContext).Assembly.GetType(
            "AITranslateMeeting.Api.Migrations.AppDbContextModelSnapshot");
        var snapshot = Assert.IsAssignableFrom<ModelSnapshot>(
            Activator.CreateInstance(snapshotType!, nonPublic: true));
        var modelDiffer = relationalContext.GetService<IMigrationsModelDiffer>();
        var migrationsAssembly = relationalContext.GetService<IMigrationsAssembly>();
        var currentModel = relationalContext.GetService<IDesignTimeModel>().Model;
        var runtimeInitializer = relationalContext.GetService<IModelRuntimeInitializer>();
        var validationLogger = relationalContext.GetService<
            IDiagnosticsLogger<DbLoggerCategory.Model.Validation>>();
        var snapshotModel = runtimeInitializer.Initialize(
            snapshot.Model,
            designTime: true,
            validationLogger);

        var differences = modelDiffer.GetDifferences(
            snapshotModel.GetRelationalModel(),
            currentModel.GetRelationalModel());
        Assert.True(
            differences.Count == 0,
            string.Join(", ", differences.Select(operation =>
                operation is Microsoft.EntityFrameworkCore.Migrations.Operations.CreateIndexOperation index
                    ? $"{operation.GetType().Name}:{index.Name}"
                    : operation.GetType().Name)));
        Assert.Contains("20261006010000_AddSmartSchedulingAndRsvp", migrationsAssembly.Migrations.Keys);
    }

    public void Dispose() => _dbContext.Dispose();

    private Task<CreateMeetingResponseDto> CreateScheduledMeetingAsync(
        string name,
        string? hostEmail = null,
        int startsInHours = 3) =>
        _service.CreateMeetingAsync(new CreateMeetingRequestDto(
            name,
            _timeProvider.GetUtcNow().UtcDateTime.AddHours(startsInHours),
            45,
            HostEmail: hostEmail));

    private static int CountOccurrences(string content, string value) =>
        content.Split(value, StringSplitOptions.None).Length - 1;

    private sealed class MutableTimeProvider(DateTimeOffset now) : TimeProvider
    {
        private DateTimeOffset _utcNow = now;

        public override DateTimeOffset GetUtcNow() => _utcNow;

        public void Advance(TimeSpan duration) => _utcNow = _utcNow.Add(duration);
    }
}
