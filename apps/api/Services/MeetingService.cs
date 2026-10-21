using System.Data;
using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using AITranslateMeeting.Api.Data;
using AITranslateMeeting.Api.DTOs;
using AITranslateMeeting.Api.Entities;
using AITranslateMeeting.Api.Exceptions;
using AITranslateMeeting.Api.Options;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Options;

namespace AITranslateMeeting.Api.Services;

public interface IMeetingService : IMeetingScheduleService, IMeetingMinutesService, IMeetingAdmissionService
{
    Task<CreateMeetingResponseDto> CreateMeetingAsync(CreateMeetingRequestDto request, CancellationToken ct = default);
    Task<MeetingDetailsDto> GetMeetingAsync(string meetingCode, string? sessionToken = null, CancellationToken ct = default);
    Task<JoinMeetingResultDto> JoinMeetingAsync(string meetingCode, JoinMeetingRequestDto request, CancellationToken ct = default);
    Task LeaveMeetingAsync(string meetingCode, LeaveMeetingRequestDto request, string? sessionToken = null, CancellationToken ct = default);
    Task EndMeetingAsync(string meetingCode, string? sessionToken = null, CancellationToken ct = default);
    Task<IEnumerable<ParticipantDto>> GetActiveParticipantsAsync(string meetingCode, string? sessionToken = null, CancellationToken ct = default);
    Task<UpdateSubtitlePreferencesResponseDto> UpdateSubtitlePreferencesAsync(string meetingCode, UpdateSubtitlePreferencesRequestDto request, string? sessionToken = null, CancellationToken ct = default);
}

public sealed partial class MeetingService : IMeetingService
{
    private static readonly HashSet<string> ValidLanguages = new(StringComparer.OrdinalIgnoreCase) { "vi", "en", "ja", "ko", "zh", "th", "id", "tl", "ar", "fr", "de", "es" };
    private static readonly HashSet<string> ValidSpokenLanguages = new(ValidLanguages, StringComparer.OrdinalIgnoreCase) { "auto" };
    private const string AllowedChars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

    private readonly AppDbContext _context;
    private readonly ILiveKitService _liveKitService;
    private readonly ISubtitleTokenService _subtitleTokenService;
    private readonly IAdmissionTokenService _admissionTokenService;
    private readonly IParticipantSessionService _sessionTokenService;
    private readonly AdmissionTokenOptions _admissionOptions;
    private readonly ILicenseService? _licenseService;
    private readonly TimeProvider _timeProvider;
    private readonly ILogger<MeetingService> _logger;

    public MeetingService(
        AppDbContext context,
        ILiveKitService liveKitService,
        ISubtitleTokenService subtitleTokenService,
        IAdmissionTokenService admissionTokenService,
        IParticipantSessionService sessionTokenService,
        TimeProvider timeProvider,
        ILogger<MeetingService> logger,
        IOptions<AdmissionTokenOptions>? admissionOptions = null,
        ILicenseService? licenseService = null)
    {
        _context = context;
        _liveKitService = liveKitService;
        _subtitleTokenService = subtitleTokenService;
        _admissionTokenService = admissionTokenService;
        _sessionTokenService = sessionTokenService;
        _timeProvider = timeProvider;
        _logger = logger;
        _admissionOptions = admissionOptions?.Value ?? new AdmissionTokenOptions();
        _licenseService = licenseService;
    }

    public async Task<CreateMeetingResponseDto> CreateMeetingAsync(CreateMeetingRequestDto request, CancellationToken ct = default)
    {
        var trimmedName = request.Name?.Trim();
        if (string.IsNullOrWhiteSpace(trimmedName))
            throw new ArgumentException("Meeting name cannot be empty or whitespace.", nameof(request.Name));
        if (trimmedName.Length > 200)
            throw new ArgumentException("Meeting name cannot exceed 200 characters.", nameof(request.Name));

        if (request.DurationMinutes is < 5 or > 480)
            throw new ArgumentException("Meeting duration must be between 5 and 480 minutes.", nameof(request.DurationMinutes));

        var scheduledStartAt = request.ScheduledStartAt.HasValue
            ? NormalizeUtc(request.ScheduledStartAt.Value)
            : (DateTime?)null;
        var timezone = NormalizeOptionalValue(request.Timezone, "Asia/Ho_Chi_Minh");
        var defaultSpokenLanguage = NormalizeLanguage(
            request.DefaultSpokenLanguage,
            "vi",
            ValidSpokenLanguages,
            nameof(request.DefaultSpokenLanguage));
        var defaultTargetLanguage = NormalizeLanguage(
            request.DefaultTargetLanguage,
            "ja",
            ValidLanguages,
            nameof(request.DefaultTargetLanguage));
        var domainGlossary = NormalizeOptionalValue(request.DomainGlossary, "general");
        var hostEmail = NormalizeEmail(request.HostEmail);

        if (_licenseService != null)
        {
            var activeCutoff = UtcNow().AddHours(-4);
            var activeRooms = await _context.Meetings
                .CountAsync(m => m.EndedAt == null && (m.CreatedAt >= activeCutoff || _context.MeetingParticipants.Any(p => p.MeetingId == m.Id && p.LeftAt == null && p.JoinedAt >= activeCutoff)), ct);
            if (!_licenseService.CanCreateRoom(activeRooms))
            {
                var lic = _licenseService.GetCurrentLicense();
                throw new InvalidOperationException(
                    $"License capacity reached: active rooms ({activeRooms}) >= maximum allowed ({lic.MaxConcurrentRooms}) for tier '{lic.Tier}'.");
            }
        }

        string meetingCode;
        var attempts = 0;
        do
        {
            meetingCode = GenerateMeetingCode();
            if (++attempts > 20)
                throw new InvalidOperationException("Failed to generate a unique meeting code.");
        }
        while (await _context.Meetings.AnyAsync(m => m.MeetingCode == meetingCode, ct));

        var meeting = new Meeting
        {
            Id = Guid.NewGuid(),
            MeetingCode = meetingCode,
            RoomName = $"meeting_{meetingCode}",
            Name = trimmedName,
            CreatedAt = UtcNow(),
            ScheduledStartAt = scheduledStartAt,
            ScheduledEndAt = scheduledStartAt?.AddMinutes(request.DurationMinutes ?? 45),
            Timezone = timezone,
            Agenda = request.Agenda?.Trim(),
            DefaultSpokenLanguage = defaultSpokenLanguage,
            DefaultTargetLanguage = defaultTargetLanguage,
            DomainGlossary = domainGlossary,
            HostEmail = hostEmail
        };

        _context.Meetings.Add(meeting);
        await _context.SaveChangesAsync(ct);

        var hostToken = _admissionTokenService.GenerateHostToken(meeting.Id);
        _logger.LogInformation("Created meeting {MeetingCode} (ID: {MeetingId})", meeting.MeetingCode, meeting.Id);

        return new CreateMeetingResponseDto(
            meeting.Id,
            meeting.MeetingCode,
            meeting.RoomName,
            meeting.Name,
            meeting.CreatedAt,
            hostToken,
            meeting.ScheduledStartAt,
            meeting.ScheduledEndAt,
            meeting.Timezone,
            meeting.Agenda,
            meeting.DefaultSpokenLanguage,
            meeting.DefaultTargetLanguage,
            meeting.DomainGlossary);
    }

    public async Task<MeetingDetailsDto> GetMeetingAsync(
        string meetingCode,
        string? sessionToken = null,
        CancellationToken ct = default)
    {
        var meeting = await FindMeetingAsync(meetingCode, false, ct);

        if (string.IsNullOrWhiteSpace(sessionToken))
            throw Unauthorized("session_token_missing", "Session token is required.");

        await ValidateSessionOrHostTokenAsync(sessionToken, meeting.Id, SessionScopes.Read, ct);

        return new MeetingDetailsDto(
            meeting.Id,
            meeting.MeetingCode,
            meeting.RoomName,
            meeting.Name,
            meeting.CreatedAt,
            meeting.EndedAt);
    }

    public async Task<JoinMeetingResultDto> JoinMeetingAsync(
        string meetingCode,
        JoinMeetingRequestDto request,
        CancellationToken ct = default)
    {
        var meeting = await FindMeetingAsync(meetingCode, true, ct);
        ReactivateMeetingIfEnded(meeting);
        var (displayName, spokenLanguage, targetLanguage) = ValidateParticipantInput(request);

        if (string.IsNullOrWhiteSpace(request.AdmissionToken))
        {
            return await CreatePendingAdmissionAsync(
                meeting,
                displayName,
                spokenLanguage,
                targetLanguage,
                ct);
        }

        var claims = _admissionTokenService.ValidateToken(request.AdmissionToken);
        EnsureMeetingBinding(claims, meeting.Id);

        if (claims.Scope == AdmissionTokenScopes.Host && claims.Role == "host" && claims.AdmissionId is null)
        {
            return await CreateParticipantAsync(
                meeting,
                displayName,
                spokenLanguage,
                targetLanguage,
                "host",
                null,
                ct);
        }

        if (claims.Role != "participant" || claims.AdmissionId is null
            || claims.Scope is not (AdmissionTokenScopes.Join or AdmissionTokenScopes.Poll))
        {
            throw Forbidden("admission_role_invalid", "The admission token cannot grant the requested role.");
        }

        var admission = await _context.MeetingAdmissions
            .FirstOrDefaultAsync(item => item.Id == claims.AdmissionId.Value && item.MeetingId == meeting.Id, ct)
            ?? throw Forbidden("admission_not_found", "The admission grant does not exist for this meeting.");

        EnsureAdmissionMatchesToken(admission, claims);
        EnsureAdmissionUsable(admission);

        if (admission.Status == "pending")
        {
            if (_context.ChangeTracker.HasChanges())
                await _context.SaveChangesAsync(ct);
            return BuildPendingResponse(meeting, admission, request.AdmissionToken);
        }
        if (admission.Status == "rejected")
            throw Forbidden("admission_rejected", "The host rejected this admission request.");
        if (admission.Status != "approved")
            throw Forbidden("admission_invalid_state", "The admission request is not approved.");

        if (admission.Type == "request")
        {
            displayName = admission.DisplayName!;
            spokenLanguage = admission.SpokenLanguage!;
            targetLanguage = admission.TargetLanguage!;
        }

        return await CreateParticipantAsync(
            meeting,
            displayName,
            spokenLanguage,
            targetLanguage,
            "participant",
            admission,
            ct);
    }

    public async Task LeaveMeetingAsync(
        string meetingCode,
        LeaveMeetingRequestDto request,
        string? sessionToken = null,
        CancellationToken ct = default)
    {
        var meeting = await FindMeetingAsync(meetingCode, true, ct);

        if (string.IsNullOrWhiteSpace(sessionToken))
            throw Unauthorized("session_token_missing", "Session token is required.");

        SessionTokenClaims? sessionClaims = null;
        var isHost = false;

        try
        {
            sessionClaims = await _sessionTokenService.ValidateSessionTokenAsync(sessionToken, SessionScopes.Leave, meeting.Id, ct);
            if (sessionClaims.Role == "host" || sessionClaims.Scopes.Contains(SessionScopes.Host))
            {
                isHost = true;
            }
        }
        catch (AdmissionException ex) when (ex.Code is "session_cross_room" or "session_token_revoked" or "session_token_expired")
        {
            throw;
        }
        catch
        {
            try
            {
                var hostClaims = _admissionTokenService.ValidateToken(sessionToken);
                EnsureMeetingBinding(hostClaims, meeting.Id);
                if (hostClaims.Scope == AdmissionTokenScopes.Host && hostClaims.Role == "host")
                {
                    isHost = true;
                }
                else
                {
                    throw Unauthorized("session_token_invalid", "Session token is invalid.");
                }
            }
            catch (AdmissionException)
            {
                throw;
            }
            catch
            {
                throw Unauthorized("session_token_invalid", "Session token is invalid.");
            }
        }

        if (!isHost && sessionClaims != null && sessionClaims.ParticipantId != request.ParticipantId)
        {
            throw Forbidden("participant_impersonation", "Participants cannot disconnect other participants.");
        }

        var participant = await _context.MeetingParticipants
            .FirstOrDefaultAsync(p => p.Id == request.ParticipantId && p.MeetingId == meeting.Id, ct)
            ?? throw new KeyNotFoundException($"Participant '{request.ParticipantId}' not found in meeting '{meetingCode}'.");

        if (participant.LeftAt == null)
        {
            participant.LeftAt = UtcNow();
            await _context.SaveChangesAsync(ct);
            _logger.LogInformation("Participant {ParticipantId} left meeting {MeetingCode}", request.ParticipantId, meeting.MeetingCode);
        }

        if (sessionClaims != null)
        {
            await _sessionTokenService.RevokeSessionAsync(sessionClaims.Jti, ct);
        }
        else
        {
            await _sessionTokenService.RevokeParticipantSessionsAsync(meeting.Id, request.ParticipantId, ct);
        }

        var remainingActive = await _context.MeetingParticipants
            .CountAsync(p => p.MeetingId == meeting.Id && p.LeftAt == null, ct);
        if (remainingActive == 0 && meeting.EndedAt == null)
        {
            meeting.EndedAt = UtcNow();
            await _context.SaveChangesAsync(ct);
            _logger.LogInformation("Meeting {MeetingCode} automatically ended: all participants have left", meeting.MeetingCode);
        }
    }

    public async Task EndMeetingAsync(
        string meetingCode,
        string? sessionToken = null,
        CancellationToken ct = default)
    {
        var meeting = await FindMeetingAsync(meetingCode, true, ct);
        if (meeting.EndedAt != null)
        {
            throw Conflict("meeting_ended", "Meeting has already ended.");
        }

        if (string.IsNullOrWhiteSpace(sessionToken))
        {
            throw Unauthorized("session_token_missing", "Session token or host token is required.");
        }

        await ValidateHostTokenAsync(sessionToken, meeting.Id, ct);

        var now = UtcNow();
        meeting.EndedAt = now;

        var activeParticipants = await _context.MeetingParticipants
            .Where(p => p.MeetingId == meeting.Id && p.LeftAt == null)
            .ToListAsync(ct);

        foreach (var participant in activeParticipants)
        {
            participant.LeftAt = now;
        }

        await _context.SaveChangesAsync(ct);
        await _sessionTokenService.RevokeMeetingSessionsAsync(meeting.Id, ct);

        _logger.LogInformation("Host ended meeting {MeetingCode} (ID: {MeetingId})", meeting.MeetingCode, meeting.Id);
    }

    public async Task<IEnumerable<ParticipantDto>> GetActiveParticipantsAsync(
        string meetingCode,
        string? sessionToken = null,
        CancellationToken ct = default)
    {
        var meeting = await FindMeetingAsync(meetingCode, false, ct);

        if (string.IsNullOrWhiteSpace(sessionToken))
            throw Unauthorized("session_token_missing", "Session token is required.");

        await ValidateSessionOrHostTokenAsync(sessionToken, meeting.Id, SessionScopes.Read, ct);

        return await _context.MeetingParticipants
            .AsNoTracking()
            .Where(p => p.MeetingId == meeting.Id && p.LeftAt == null)
            .OrderBy(p => p.JoinedAt)
            .Select(p => new ParticipantDto(
                p.Id,
                p.Identity,
                p.DisplayName,
                p.SpokenLanguage,
                p.TargetLanguage,
                p.JoinedAt))
            .ToListAsync(ct);
    }

    public async Task<UpdateSubtitlePreferencesResponseDto> UpdateSubtitlePreferencesAsync(
        string meetingCode,
        UpdateSubtitlePreferencesRequestDto request,
        string? sessionToken = null,
        CancellationToken ct = default)
    {
        var meeting = await FindMeetingAsync(meetingCode, true, ct);
        ReactivateMeetingIfEnded(meeting);

        if (string.IsNullOrWhiteSpace(sessionToken))
            throw Unauthorized("session_token_missing", "Session token is required.");

        var claims = await _sessionTokenService.ValidateSessionTokenAsync(
            sessionToken,
            SessionScopes.Read,
            meeting.Id,
            ct);
        var targetLanguage = NormalizeTargetLanguage(request.TargetLanguage);

        var participant = await _context.MeetingParticipants.FirstOrDefaultAsync(
            item => item.Id == claims.ParticipantId
                && item.MeetingId == meeting.Id
                && item.LeftAt == null,
            ct) ?? throw new KeyNotFoundException("The active participant was not found in this meeting.");

        participant.TargetLanguage = targetLanguage;
        var subtitleToken = _subtitleTokenService.GenerateAccessToken(
            meeting.Id,
            participant.Id,
            participant.DisplayName,
            participant.SpokenLanguage,
            participant.TargetLanguage,
            participant.Identity);
        await _context.SaveChangesAsync(ct);

        _logger.LogInformation(
            "Participant {ParticipantId} changed subtitle target language in meeting {MeetingCode}",
            participant.Id,
            meeting.MeetingCode);

        return new UpdateSubtitlePreferencesResponseDto(targetLanguage, subtitleToken);
    }

    private async Task<AdmissionPendingResponseDto> CreatePendingAdmissionAsync(
        Meeting meeting,
        string displayName,
        string spokenLanguage,
        string targetLanguage,
        CancellationToken ct)
    {
        var now = UtcNow();
        var admission = new MeetingAdmission
        {
            Id = Guid.NewGuid(),
            MeetingId = meeting.Id,
            Type = "request",
            Status = "pending",
            Role = "participant",
            DisplayName = displayName,
            SpokenLanguage = spokenLanguage,
            TargetLanguage = targetLanguage,
            CreatedAt = now,
            ExpiresAt = now.AddMinutes(_admissionOptions.RequestTokenTtlMinutes)
        };

        _context.MeetingAdmissions.Add(admission);
        await _context.SaveChangesAsync(ct);
        var token = _admissionTokenService.GenerateRequestToken(meeting.Id, admission.Id, admission.ExpiresAt);
        return BuildPendingResponse(meeting, admission, token);
    }

    private async Task<JoinMeetingResponseDto> CreateParticipantAsync(
        Meeting meeting,
        string displayName,
        string spokenLanguage,
        string targetLanguage,
        string role,
        MeetingAdmission? admission,
        CancellationToken ct)
    {
        IDbContextTransaction? transaction = null;
        if (_context.Database.IsRelational())
            transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);

        MeetingParticipant? participant = null;
        try
        {
            var now = UtcNow();
            if (admission != null)
            {
                if (_context.Database.IsRelational())
                {
                    var affected = await _context.MeetingAdmissions
                        .Where(item => item.Id == admission.Id && item.ConsumedAt == null && item.ExpiresAt > now)
                        .ExecuteUpdateAsync(update => update.SetProperty(item => item.ConsumedAt, now), ct);
                    if (affected != 1)
                        throw Conflict("admission_already_used", "The admission token has already been used.");
                    _context.Entry(admission).State = EntityState.Detached;
                }
                else
                {
                    if (admission.ConsumedAt != null)
                        throw Conflict("admission_already_used", "The admission token has already been used.");
                    admission.ConsumedAt = now;
                }
            }

            participant = new MeetingParticipant
            {
                Id = Guid.NewGuid(),
                MeetingId = meeting.Id,
                Identity = $"p_{Guid.NewGuid():N}",
                DisplayName = displayName,
                SpokenLanguage = spokenLanguage,
                TargetLanguage = targetLanguage,
                Role = role,
                JoinedAt = now
            };

            _context.MeetingParticipants.Add(participant);
            await _context.SaveChangesAsync(ct);

            var liveKitToken = _liveKitService.GenerateAccessToken(meeting.RoomName, participant.Identity, displayName);
            var subtitleToken = _subtitleTokenService.GenerateAccessToken(
                meeting.Id,
                participant.Id,
                participant.DisplayName,
                participant.SpokenLanguage,
                participant.TargetLanguage,
                participant.Identity);

            var scopes = role == "host"
                ? new[] { SessionScopes.Read, SessionScopes.Leave, SessionScopes.Host }
                : new[] { SessionScopes.Read, SessionScopes.Leave };

            var sessionToken = await _sessionTokenService.GenerateSessionTokenAsync(
                meeting,
                participant,
                role,
                scopes,
                ct);

            if (transaction != null)
                await transaction.CommitAsync(ct);

            _logger.LogInformation(
                "Participant {ParticipantId} joined meeting {MeetingCode} as {Role}",
                participant.Id,
                meeting.MeetingCode,
                role);

            return new JoinMeetingResponseDto(
                meeting.Id,
                meeting.MeetingCode,
                participant.Id,
                participant.Identity,
                participant.DisplayName,
                participant.SpokenLanguage,
                participant.TargetLanguage,
                _liveKitService.GetPublicUrl(),
                liveKitToken,
                subtitleToken,
                participant.Role,
                participant.JoinedAt,
                sessionToken);
        }
        catch
        {
            if (transaction != null)
            {
                await transaction.RollbackAsync(CancellationToken.None);
            }
            else if (participant != null)
            {
                // Non-relational providers do not support transactions. Restore the
                // pre-join state so tests and alternate providers cannot retain an
                // orphan participant or consume a one-time admission on failure.
                var participantSessions = _context.ParticipantSessions.Local
                    .Where(session => session.ParticipantId == participant.Id)
                    .ToList();
                _context.ParticipantSessions.RemoveRange(participantSessions);
                _context.MeetingParticipants.Remove(participant);
                if (admission != null)
                {
                    admission.ConsumedAt = null;
                }

                await _context.SaveChangesAsync(CancellationToken.None);
            }
            throw;
        }
        finally
        {
            if (transaction != null)
                await transaction.DisposeAsync();
        }
    }

    private async Task<Meeting> FindMeetingAsync(string meetingCode, bool tracked, CancellationToken ct)
    {
        var code = meetingCode?.Trim().ToUpperInvariant();
        IQueryable<Meeting> query = _context.Meetings;
        if (!tracked)
            query = query.AsNoTracking();
        return await query.FirstOrDefaultAsync(m => m.MeetingCode == code, ct)
            ?? throw new KeyNotFoundException($"Meeting with code '{meetingCode}' was not found.");
    }

    private static (string DisplayName, string SpokenLanguage, string TargetLanguage) ValidateParticipantInput(
        JoinMeetingRequestDto request)
    {
        var displayName = request.DisplayName?.Trim();
        if (string.IsNullOrWhiteSpace(displayName))
            throw new ArgumentException("Display name cannot be empty.", nameof(request.DisplayName));
        if (displayName.Length > 100)
            throw new ArgumentException("Display name cannot exceed 100 characters.", nameof(request.DisplayName));

        var spokenLanguage = request.SpokenLanguage?.Trim().ToLowerInvariant();
        var targetLanguage = request.TargetLanguage?.Trim().ToLowerInvariant();
        if (string.IsNullOrEmpty(spokenLanguage) || !ValidSpokenLanguages.Contains(spokenLanguage))
            throw new ArgumentException("Spoken language must be one of: 'auto', 'vi', 'en', 'ja', 'ko', 'zh', 'th', 'id', 'tl', 'ar', 'fr', 'de', 'es'.", nameof(request.SpokenLanguage));
        if (string.IsNullOrEmpty(targetLanguage) || !ValidLanguages.Contains(targetLanguage))
            throw new ArgumentException("Target language must be one of: 'vi', 'en', 'ja', 'ko', 'zh', 'th', 'id', 'tl', 'ar', 'fr', 'de', 'es'.", nameof(request.TargetLanguage));

        return (displayName, spokenLanguage, targetLanguage);
    }

    private static string NormalizeTargetLanguage(string? targetLanguage)
    {
        var normalized = targetLanguage?.Trim().ToLowerInvariant();
        if (string.IsNullOrEmpty(normalized) || !ValidLanguages.Contains(normalized))
            throw new ArgumentException("Target language must be one of: 'vi', 'en', 'ja', 'ko', 'zh', 'th', 'id', 'tl', 'ar', 'fr', 'de', 'es'.", nameof(targetLanguage));
        return normalized;
    }

    private static string NormalizeLanguage(
        string? language,
        string defaultValue,
        HashSet<string> validValues,
        string parameterName)
    {
        var normalized = string.IsNullOrWhiteSpace(language)
            ? defaultValue
            : language.Trim().ToLowerInvariant();
        if (!validValues.Contains(normalized))
            throw new ArgumentException($"Language '{normalized}' is not supported.", parameterName);
        return normalized;
    }

    private static string NormalizeRequiredLanguage(
        string? language,
        HashSet<string> validValues,
        string parameterName)
    {
        var normalized = language?.Trim().ToLowerInvariant();
        if (string.IsNullOrEmpty(normalized) || !validValues.Contains(normalized))
            throw new ArgumentException("Language is required and must be supported.", parameterName);
        return normalized;
    }

    private static string NormalizeOptionalValue(string? value, string defaultValue) =>
        string.IsNullOrWhiteSpace(value) ? defaultValue : value.Trim();

    private static string? NormalizeEmail(string? email)
    {
        if (string.IsNullOrWhiteSpace(email))
            return null;

        var normalized = email.Trim().ToLowerInvariant();
        if (normalized.Length > 254)
            throw new ArgumentException("Email cannot exceed 254 characters.", nameof(email));
        return normalized;
    }

    private static DateTime NormalizeUtc(DateTime value) => value.Kind switch
    {
        DateTimeKind.Utc => value,
        DateTimeKind.Local => value.ToUniversalTime(),
        _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
    };

    private async Task ValidateHostTokenAsync(string token, Guid meetingId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(token))
            throw Forbidden("host_token_required", "A valid host token is required.");

        try
        {
            var session = await _sessionTokenService.ValidateSessionTokenAsync(token, null, meetingId, ct);
            if (session.Role != "host" || !session.Scopes.Contains(SessionScopes.Host))
            {
                throw Forbidden("host_role_required", "Host role is required.");
            }
            return;
        }
        catch (AdmissionException ex) when (ex.Code == "host_role_required")
        {
            throw;
        }
        catch
        {
            // Not a session token or invalid session token, fallback to admission host token
        }

        var claims = _admissionTokenService.ValidateToken(token);
        EnsureMeetingBinding(claims, meetingId);
        if (claims.Scope != AdmissionTokenScopes.Host || claims.Role != "host" || claims.AdmissionId != null)
            throw Forbidden("host_token_required", "A valid host token is required.");
    }

    private async Task ValidateSessionOrHostTokenAsync(
        string token,
        Guid meetingId,
        string requiredScope,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            throw Unauthorized("session_token_missing", "Session token is required.");
        }

        AdmissionException? sessionException = null;
        try
        {
            await _sessionTokenService.ValidateSessionTokenAsync(token, requiredScope, meetingId, ct);
            return;
        }
        catch (AdmissionException ex)
        {
            sessionException = ex;
            if (ex.Code is "session_cross_room" or "session_token_revoked" or "session_token_expired")
            {
                throw;
            }
        }

        try
        {
            var hostClaims = _admissionTokenService.ValidateToken(token);
            EnsureMeetingBinding(hostClaims, meetingId);
            if (hostClaims.Scope == AdmissionTokenScopes.Host && hostClaims.Role == "host")
            {
                return;
            }
        }
        catch (AdmissionException)
        {
        }
        catch
        {
        }

        if (sessionException != null)
        {
            throw sessionException;
        }

        throw Unauthorized("session_token_invalid", "Session token is invalid.");
    }

    private static void EnsureMeetingBinding(AdmissionTokenClaims claims, Guid meetingId)
    {
        if (claims.MeetingId != meetingId)
            throw Forbidden("admission_wrong_meeting", "The admission token belongs to another meeting.");
    }

    private static void EnsureAdmissionMatchesToken(MeetingAdmission admission, AdmissionTokenClaims claims)
    {
        var expectedScope = admission.Type == "invite" ? AdmissionTokenScopes.Join : AdmissionTokenScopes.Poll;
        if (admission.Role != "participant" || claims.Role != admission.Role || claims.Scope != expectedScope)
            throw Forbidden("admission_role_invalid", "The admission token role or scope is invalid.");
    }

    private void EnsureAdmissionUsable(MeetingAdmission admission)
    {
        if (admission.ExpiresAt <= UtcNow())
            throw Unauthorized("admission_token_expired", "Admission token has expired.");
        if (admission.ConsumedAt != null)
            throw Conflict("admission_already_used", "The admission token has already been used.");
    }

    private void ReactivateMeetingIfEnded(Meeting meeting)
    {
        if (meeting.EndedAt != null)
        {
            meeting.EndedAt = null;
            _logger.LogInformation(
                "Re-activated meeting {MeetingCode} (ID: {MeetingId}) on participant re-entry",
                meeting.MeetingCode,
                meeting.Id);
        }
    }

    private static AdmissionPendingResponseDto BuildPendingResponse(
        Meeting meeting,
        MeetingAdmission admission,
        string token) => new(
            meeting.Id,
            meeting.MeetingCode,
            admission.Id,
            admission.Status,
            token,
            admission.ExpiresAt);

    private static AdmissionRequestDto ToAdmissionRequest(MeetingAdmission admission) => new(
        admission.Id,
        admission.Status,
        admission.Role,
        admission.DisplayName!,
        admission.SpokenLanguage!,
        admission.TargetLanguage!,
        admission.CreatedAt,
        admission.ExpiresAt);

    private DateTime UtcNow() => _timeProvider.GetUtcNow().UtcDateTime;

    private static AdmissionException Unauthorized(string code, string detail) =>
        new(StatusCodes.Status401Unauthorized, code, "Admission denied", detail);

    private static AdmissionException Forbidden(string code, string detail) =>
        new(StatusCodes.Status403Forbidden, code, "Admission denied", detail);

    private static AdmissionException Conflict(string code, string detail) =>
        new(StatusCodes.Status409Conflict, code, "Admission conflict", detail);

    private static string GenerateMeetingCode()
    {
        var chars = new char[6];
        var bytes = new byte[6];
        RandomNumberGenerator.Fill(bytes);
        for (var i = 0; i < chars.Length; i++)
            chars[i] = AllowedChars[bytes[i] % AllowedChars.Length];
        return new string(chars);
    }
}
