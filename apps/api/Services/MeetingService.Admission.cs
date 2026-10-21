using AITranslateMeeting.Api.DTOs;
using AITranslateMeeting.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace AITranslateMeeting.Api.Services;

public interface IMeetingAdmissionService
{
    Task<InviteResponseDto> CreateInviteAsync(string meetingCode, string hostToken, CreateInviteRequestDto request, CancellationToken ct = default);
    Task<IReadOnlyList<AdmissionRequestDto>> GetAdmissionsAsync(string meetingCode, string hostToken, CancellationToken ct = default);
    Task<AdmissionRequestDto> DecideAdmissionAsync(string meetingCode, Guid admissionId, string hostToken, AdmissionDecisionRequestDto request, CancellationToken ct = default);
}

public sealed partial class MeetingService : IMeetingAdmissionService
{
    public async Task<InviteResponseDto> CreateInviteAsync(
        string meetingCode,
        string hostToken,
        CreateInviteRequestDto request,
        CancellationToken ct = default)
    {
        var meeting = await FindMeetingAsync(meetingCode, true, ct);
        ReactivateMeetingIfEnded(meeting);
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
}
