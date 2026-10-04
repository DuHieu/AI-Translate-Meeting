using AITranslateMeeting.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace AITranslateMeeting.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Meeting> Meetings => Set<Meeting>();
    public DbSet<MeetingParticipant> MeetingParticipants => Set<MeetingParticipant>();
    public DbSet<MeetingAdmission> MeetingAdmissions => Set<MeetingAdmission>();
    public DbSet<MeetingMinute> MeetingMinutes => Set<MeetingMinute>();
    public DbSet<ParticipantSession> ParticipantSessions => Set<ParticipantSession>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Meeting>(entity =>
        {
            entity.ToTable("meetings");

            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.MeetingCode).HasColumnName("meeting_code").HasMaxLength(12).IsRequired();
            entity.Property(e => e.RoomName).HasColumnName("room_name").HasMaxLength(100).IsRequired();
            entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(200).IsRequired();
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").IsRequired();
            entity.Property(e => e.EndedAt).HasColumnName("ended_at");

            entity.HasIndex(e => e.MeetingCode).IsUnique();
            entity.HasIndex(e => e.RoomName).IsUnique();
            entity.HasIndex(e => e.EndedAt);

            entity.HasMany(e => e.Participants)
                  .WithOne(p => p.Meeting)
                  .HasForeignKey(p => p.MeetingId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(e => e.Admissions)
                  .WithOne(a => a.Meeting)
                  .HasForeignKey(a => a.MeetingId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<MeetingParticipant>(entity =>
        {
            entity.ToTable("meeting_participants");

            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.MeetingId).HasColumnName("meeting_id").IsRequired();
            entity.Property(e => e.Identity).HasColumnName("identity").HasMaxLength(100).IsRequired();
            entity.Property(e => e.DisplayName).HasColumnName("display_name").HasMaxLength(100).IsRequired();
            entity.Property(e => e.SpokenLanguage).HasColumnName("spoken_language").HasMaxLength(10).IsRequired();
            entity.Property(e => e.TargetLanguage).HasColumnName("target_language").HasMaxLength(10).IsRequired();
            entity.Property(e => e.Role).HasColumnName("role").HasMaxLength(20).HasDefaultValue("participant").IsRequired();
            entity.Property(e => e.JoinedAt).HasColumnName("joined_at").IsRequired();
            entity.Property(e => e.LeftAt).HasColumnName("left_at");

            entity.HasIndex(e => e.MeetingId);
            entity.HasIndex(e => e.Identity);
            entity.HasIndex(e => new { e.MeetingId, e.LeftAt });
        });

        modelBuilder.Entity<MeetingAdmission>(entity =>
        {
            entity.ToTable("meeting_admissions");

            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.MeetingId).HasColumnName("meeting_id").IsRequired();
            entity.Property(e => e.Type).HasColumnName("type").HasMaxLength(20).IsRequired();
            entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(20).IsRequired();
            entity.Property(e => e.Role).HasColumnName("role").HasMaxLength(20).IsRequired();
            entity.Property(e => e.DisplayName).HasColumnName("display_name").HasMaxLength(100);
            entity.Property(e => e.SpokenLanguage).HasColumnName("spoken_language").HasMaxLength(10);
            entity.Property(e => e.TargetLanguage).HasColumnName("target_language").HasMaxLength(10);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").IsRequired();
            entity.Property(e => e.ExpiresAt).HasColumnName("expires_at").IsRequired();
            entity.Property(e => e.DecidedAt).HasColumnName("decided_at");
            entity.Property(e => e.ConsumedAt).HasColumnName("consumed_at");

            entity.HasIndex(e => new { e.MeetingId, e.Status });
            entity.HasIndex(e => e.ExpiresAt);
        });

        modelBuilder.Entity<MeetingMinute>(entity =>
        {
            entity.ToTable("meeting_minutes");

            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.MeetingId).HasColumnName("meeting_id").IsRequired();
            entity.Property(e => e.Title).HasColumnName("title").HasMaxLength(200).IsRequired();
            entity.Property(e => e.Summary).HasColumnName("summary").HasColumnType("text").IsRequired();
            entity.Property(e => e.MarkdownContent).HasColumnName("markdown_content").HasColumnType("text").IsRequired();
            entity.Property(e => e.DecisionsJson).HasColumnName("decisions_json").HasColumnType("jsonb").IsRequired();
            entity.Property(e => e.ActionItemsJson).HasColumnName("action_items_json").HasColumnType("jsonb").IsRequired();
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").IsRequired();

            entity.HasIndex(e => e.MeetingId).IsUnique();
            entity.HasOne(e => e.Meeting)
                  .WithMany()
                  .HasForeignKey(e => e.MeetingId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ParticipantSession>(entity =>
        {
            entity.ToTable("participant_sessions");

            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.MeetingId).HasColumnName("meeting_id").IsRequired();
            entity.Property(e => e.ParticipantId).HasColumnName("participant_id").IsRequired();
            entity.Property(e => e.Jti).HasColumnName("jti").IsRequired();
            entity.Property(e => e.Role).HasColumnName("role").HasMaxLength(32).IsRequired();
            entity.Property(e => e.Scopes).HasColumnName("scopes").HasMaxLength(256).IsRequired();
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").IsRequired();
            entity.Property(e => e.ExpiresAt).HasColumnName("expires_at").IsRequired();
            entity.Property(e => e.RevokedAt).HasColumnName("revoked_at");

            entity.HasIndex(e => e.Jti).IsUnique();
            entity.HasIndex(e => new { e.MeetingId, e.ParticipantId, e.RevokedAt, e.ExpiresAt });
            entity.HasIndex(e => e.ExpiresAt);

            entity.HasOne(e => e.Meeting)
                  .WithMany()
                  .HasForeignKey(e => e.MeetingId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Participant)
                  .WithMany()
                  .HasForeignKey(e => e.ParticipantId)
                  .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
