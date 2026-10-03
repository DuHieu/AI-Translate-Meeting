using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AITranslateMeeting.Api.Entities;

[Table("participant_sessions")]
public class ParticipantSession
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public Guid MeetingId { get; set; }

    [Required]
    public Guid ParticipantId { get; set; }

    [Required]
    public Guid Jti { get; set; }

    [Required, MaxLength(32)]
    public string Role { get; set; } = "participant";

    [Required, MaxLength(256)]
    public string Scopes { get; set; } = "meeting:read meeting:leave";

    [Required]
    public DateTime CreatedAt { get; set; }

    [Required]
    public DateTime ExpiresAt { get; set; }

    public DateTime? RevokedAt { get; set; }

    [ForeignKey(nameof(MeetingId))]
    public Meeting? Meeting { get; set; }

    [ForeignKey(nameof(ParticipantId))]
    public MeetingParticipant? Participant { get; set; }
}
