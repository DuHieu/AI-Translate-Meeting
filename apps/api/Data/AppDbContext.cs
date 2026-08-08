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

            entity.HasMany(e => e.Participants)
                  .WithOne(p => p.Meeting)
                  .HasForeignKey(p => p.MeetingId)
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
            entity.Property(e => e.JoinedAt).HasColumnName("joined_at").IsRequired();
            entity.Property(e => e.LeftAt).HasColumnName("left_at");

            entity.HasIndex(e => e.MeetingId);
            entity.HasIndex(e => e.Identity);
        });
    }
}
