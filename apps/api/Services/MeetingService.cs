using System.Data;
using System.Security.Cryptography;
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

public interface IMeetingService
{
    Task<CreateMeetingResponseDto> CreateMeetingAsync(CreateMeetingRequestDto request, CancellationToken ct = default);
    Task<MeetingDetailsDto> GetMeetingAsync(string meetingCode, string? sessionToken = null, CancellationToken ct = default);
    Task<JoinMeetingResultDto> JoinMeetingAsync(string meetingCode, JoinMeetingRequestDto request, CancellationToken ct = default);
    Task<InviteResponseDto> CreateInviteAsync(string meetingCode, string hostToken, CreateInviteRequestDto request, CancellationToken ct = default);
    Task<IReadOnlyList<AdmissionRequestDto>> GetAdmissionsAsync(string meetingCode, string hostToken, CancellationToken ct = default);
    Task<AdmissionRequestDto> DecideAdmissionAsync(string meetingCode, Guid admissionId, string hostToken, AdmissionDecisionRequestDto request, CancellationToken ct = default);
    Task LeaveMeetingAsync(string meetingCode, LeaveMeetingRequestDto request, string? sessionToken = null, CancellationToken ct = default);
    Task EndMeetingAsync(string meetingCode, string? sessionToken = null, CancellationToken ct = default);
    Task<IEnumerable<ParticipantDto>> GetActiveParticipantsAsync(string meetingCode, string? sessionToken = null, CancellationToken ct = default);
    Task<UpdateSubtitlePreferencesResponseDto> UpdateSubtitlePreferencesAsync(string meetingCode, UpdateSubtitlePreferencesRequestDto request, string? sessionToken = null, CancellationToken ct = default);
    Task<MeetingMinutesResponse> SaveMeetingMinutesAsync(string meetingCode, SaveMeetingMinutesRequest request, CancellationToken ct = default);
    Task<MeetingMinutesResponse> GetMeetingMinutesAsync(string meetingCode, CancellationToken ct = default);
}

public sealed class MeetingService : IMeetingService
{
    private static readonly HashSet<string> ValidLanguages = new(StringComparer.OrdinalIgnoreCase) { "vi", "en", "ja", "ko", "zh", "fr", "de", "es" };
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
            CreatedAt = UtcNow()
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
            hostToken);
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
        EnsureMeetingActive(meeting, meetingCode);
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
            return BuildPendingResponse(meeting, admission, request.AdmissionToken);
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

    public async Task<InviteResponseDto> CreateInviteAsync(
        string meetingCode,
        string hostToken,
        CreateInviteRequestDto request,
        CancellationToken ct = default)
    {
        var meeting = await FindMeetingAsync(meetingCode, true, ct);
        EnsureMeetingActive(meeting, meetingCode);
        await ValidateHostTokenAsync(hostToken, meeting.Id, ct);

        var ttlMinutes = request.TtlMinutes ?? _admissionOptions.InviteTokenTtlMinutes;
        if (ttlMinutes is < 1 or > 60)
            throw new ArgumentException("Invite TTL must be between 1 and 60 minutes.", nameof(request.TtlMinutes));

        var now = UtcNow();
        var admission = new MeetingAdmission
        {
            Id = Guid.NewGuid(),
            MeetingId = meeting.Id,
            Type = "invite",
            Status = "approved",
            Role = "participant",
            CreatedAt = now,
            ExpiresAt = now.AddMinutes(ttlMinutes)
        };

        _context.MeetingAdmissions.Add(admission);
        await _context.SaveChangesAsync(ct);

        return new InviteResponseDto(
            admission.Id,
            admission.Role,
            _admissionTokenService.GenerateInviteToken(meeting.Id, admission.Id, admission.ExpiresAt),
            admission.ExpiresAt);
    }

    public async Task<IReadOnlyList<AdmissionRequestDto>> GetAdmissionsAsync(
        string meetingCode,
        string hostToken,
        CancellationToken ct = default)
    {
        var meeting = await FindMeetingAsync(meetingCode, false, ct);
        await ValidateHostTokenAsync(hostToken, meeting.Id, ct);
        var now = UtcNow();

        return await _context.MeetingAdmissions
            .AsNoTracking()
            .Where(item => item.MeetingId == meeting.Id
                && item.Type == "request"
                && item.ConsumedAt == null
                && item.ExpiresAt > now)
            .OrderBy(item => item.CreatedAt)
            .Take(100)
            .Select(item => new AdmissionRequestDto(
                item.Id,
                item.Status,
                item.Role,
                item.DisplayName!,
                item.SpokenLanguage!,
                item.TargetLanguage!,
                item.CreatedAt,
                item.ExpiresAt))
            .ToListAsync(ct);
    }

    public async Task<AdmissionRequestDto> DecideAdmissionAsync(
        string meetingCode,
        Guid admissionId,
        string hostToken,
        AdmissionDecisionRequestDto request,
        CancellationToken ct = default)
    {
        var meeting = await FindMeetingAsync(meetingCode, false, ct);
        await ValidateHostTokenAsync(hostToken, meeting.Id, ct);
        var decision = request.Decision?.Trim().ToLowerInvariant();
        if (decision is not ("approved" or "rejected"))
            throw new ArgumentException("Decision must be 'approved' or 'rejected'.", nameof(request.Decision));

        var admission = await _context.MeetingAdmissions.FirstOrDefaultAsync(
            item => item.Id == admissionId && item.MeetingId == meeting.Id && item.Type == "request",
            ct) ?? throw new KeyNotFoundException("Admission request was not found.");

        EnsureAdmissionUsable(admission);
        if (admission.Status != "pending")
            throw new InvalidOperationException("Admission request has already been decided.");

        admission.Status = decision;
        admission.DecidedAt = UtcNow();
        await _context.SaveChangesAsync(ct);

        return ToAdmissionRequest(admission);
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
        var meeting = await FindMeetingAsync(meetingCode, false, ct);
        EnsureMeetingActive(meeting, meetingCode);

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

    public async Task<MeetingMinutesResponse> SaveMeetingMinutesAsync(
        string meetingCode,
        SaveMeetingMinutesRequest request,
        CancellationToken ct = default)
    {
        var meeting = await FindMeetingAsync(meetingCode, false, ct);
        var title = request.Title?.Trim();
        var summary = request.Summary?.Trim();
        if (string.IsNullOrWhiteSpace(title))
            throw new ArgumentException("Meeting minutes title cannot be empty.", nameof(request.Title));
        if (title.Length > 200)
            throw new ArgumentException("Meeting minutes title cannot exceed 200 characters.", nameof(request.Title));
        if (string.IsNullOrWhiteSpace(summary))
            throw new ArgumentException("Meeting minutes summary cannot be empty.", nameof(request.Summary));
        if (summary.Length > 10000)
            throw new ArgumentException("Meeting minutes summary cannot exceed 10000 characters.", nameof(request.Summary));
        if (string.IsNullOrWhiteSpace(request.MarkdownContent))
            throw new ArgumentException("Meeting minutes Markdown content cannot be empty.", nameof(request.MarkdownContent));

        var decisions = request.Decisions ?? [];
        var actionItems = request.ActionItems ?? [];
        var minutes = await _context.MeetingMinutes
            .FirstOrDefaultAsync(item => item.MeetingId == meeting.Id, ct);

        if (minutes == null)
        {
            minutes = new MeetingMinute
            {
                Id = Guid.NewGuid(),
                MeetingId = meeting.Id,
                CreatedAt = UtcNow()
            };
            _context.MeetingMinutes.Add(minutes);
        }

        minutes.Title = title;
        minutes.Summary = summary;
        minutes.MarkdownContent = request.MarkdownContent;
        minutes.DecisionsJson = JsonSerializer.Serialize(decisions);
        minutes.ActionItemsJson = JsonSerializer.Serialize(actionItems);
        await _context.SaveChangesAsync(ct);

        _logger.LogInformation(
            "Saved meeting minutes {MeetingMinutesId} for meeting {MeetingCode}",
            minutes.Id,
            meeting.MeetingCode);

        return ToMeetingMinutesResponse(minutes, meeting.MeetingCode);
    }

    public async Task<MeetingMinutesResponse> GetMeetingMinutesAsync(
        string meetingCode,
        CancellationToken ct = default)
    {
        var meeting = await FindMeetingAsync(meetingCode, false, ct);
        var minutes = await _context.MeetingMinutes
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.MeetingId == meeting.Id, ct)
            ?? throw new KeyNotFoundException($"Meeting minutes for meeting '{meetingCode}' were not found.");

        return ToMeetingMinutesResponse(minutes, meeting.MeetingCode);
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
        if (string.IsNullOrEmpty(spokenLanguage) || !ValidLanguages.Contains(spokenLanguage))
            throw new ArgumentException("Spoken language must be one of: 'vi', 'en', 'ja', 'ko', 'zh', 'fr', 'de', 'es'.", nameof(request.SpokenLanguage));
        if (string.IsNullOrEmpty(targetLanguage) || !ValidLanguages.Contains(targetLanguage))
            throw new ArgumentException("Target language must be one of: 'vi', 'en', 'ja', 'ko', 'zh', 'fr', 'de', 'es'.", nameof(request.TargetLanguage));

        return (displayName, spokenLanguage, targetLanguage);
    }

    private static string NormalizeTargetLanguage(string? targetLanguage)
    {
        var normalized = targetLanguage?.Trim().ToLowerInvariant();
        if (string.IsNullOrEmpty(normalized) || !ValidLanguages.Contains(normalized))
            throw new ArgumentException("Target language must be one of: 'vi', 'en', 'ja', 'ko', 'zh', 'fr', 'de', 'es'.", nameof(targetLanguage));
        return normalized;
    }

    private static MeetingMinutesResponse ToMeetingMinutesResponse(
        MeetingMinute minutes,
        string meetingCode)
    {
        var decisions = JsonSerializer.Deserialize<List<string>>(minutes.DecisionsJson) ?? [];
        var actionItems = JsonSerializer.Deserialize<List<ActionItemDto>>(minutes.ActionItemsJson) ?? [];
        return new MeetingMinutesResponse(
            minutes.Id,
            meetingCode,
            minutes.Title,
            minutes.Summary,
            minutes.MarkdownContent,
            decisions,
            actionItems,
            minutes.CreatedAt);
    }

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

    private static void EnsureMeetingActive(Meeting meeting, string meetingCode)
    {
        if (meeting.EndedAt != null)
            throw new InvalidOperationException($"Meeting '{meetingCode}' has already ended.");
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
