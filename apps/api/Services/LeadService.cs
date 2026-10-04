using System.Collections.Concurrent;
using AITranslateMeeting.Api.DTOs;
using Microsoft.Extensions.Logging;

namespace AITranslateMeeting.Api.Services;

public interface ILeadService
{
    Task<EnterpriseLeadRecord> SubmitLeadAsync(CreateLeadRequest request, CancellationToken cancellationToken = default);
    IReadOnlyList<EnterpriseLeadRecord> GetAllLeads();
    int GetLeadCount();
}

public sealed class LeadService : ILeadService
{
    private static readonly ConcurrentQueue<EnterpriseLeadRecord> Leads = new();
    private readonly IAuditLogService _auditLogService;
    private readonly INotificationDispatcher _notificationDispatcher;
    private readonly ILogger<LeadService> _logger;

    public LeadService(
        IAuditLogService auditLogService,
        INotificationDispatcher notificationDispatcher,
        ILogger<LeadService> logger)
    {
        _auditLogService = auditLogService;
        _notificationDispatcher = notificationDispatcher;
        _logger = logger;
    }

    public async Task<EnterpriseLeadRecord> SubmitLeadAsync(CreateLeadRequest request, CancellationToken cancellationToken = default)
    {
        var record = new EnterpriseLeadRecord(
            Id: Guid.NewGuid(),
            FullName: request.FullName.Trim(),
            Email: request.Email.Trim().ToLowerInvariant(),
            Company: request.Company?.Trim(),
            TeamSize: request.TeamSize?.Trim(),
            LanguagePair: request.LanguagePair?.Trim(),
            DeploymentModel: request.DeploymentModel?.Trim(),
            Notes: request.Notes?.Trim(),
            SubmittedAtUtc: DateTime.UtcNow
        );

        Leads.Enqueue(record);

        // Log audit
        _auditLogService.LogEvent(
            "EnterpriseLeadCaptured",
            meetingId: null,
            participantId: record.Email,
            details: $"Lead: {record.FullName} ({record.Company ?? "Individual"}), deployment={record.DeploymentModel ?? "on-premise"}, team={record.TeamSize ?? "unknown"}, lang={record.LanguagePair ?? "unknown"}"
        );

        _logger.LogInformation("Enterprise lead captured: {FullName} <{Email}> ({Company})", record.FullName, record.Email, record.Company);

        // Dispatch notifications to Telegram / Webhook
        await _notificationDispatcher.DispatchEnterpriseLeadAsync(record, cancellationToken);

        return record;
    }

    public IReadOnlyList<EnterpriseLeadRecord> GetAllLeads()
    {
        return Leads.OrderByDescending(l => l.SubmittedAtUtc).ToList();
    }

    public int GetLeadCount() => Leads.Count;
}
