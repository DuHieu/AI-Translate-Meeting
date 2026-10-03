using AITranslateMeeting.Api.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITranslateMeeting.Api.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20261001110000_OptimizeParticipantIndexes")]
public partial class OptimizeParticipantIndexes : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateIndex(
            name: "IX_meeting_participants_meeting_id_left_at",
            table: "meeting_participants",
            columns: new[] { "meeting_id", "left_at" });
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropIndex(
            name: "IX_meeting_participants_meeting_id_left_at",
            table: "meeting_participants");
    }
}
