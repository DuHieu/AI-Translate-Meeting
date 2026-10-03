using AITranslateMeeting.Api.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITranslateMeeting.Api.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20261001100000_AddParticipantSessions")]
public partial class AddParticipantSessions : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "participant_sessions",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                meeting_id = table.Column<Guid>(type: "uuid", nullable: false),
                participant_id = table.Column<Guid>(type: "uuid", nullable: false),
                jti = table.Column<Guid>(type: "uuid", nullable: false),
                role = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                scopes = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                expires_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                revoked_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_participant_sessions", x => x.id);
                table.ForeignKey(
                    name: "FK_participant_sessions_meetings_meeting_id",
                    column: x => x.meeting_id,
                    principalTable: "meetings",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey(
                    name: "FK_participant_sessions_meeting_participants_participant_id",
                    column: x => x.participant_id,
                    principalTable: "meeting_participants",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "IX_participant_sessions_expires_at",
            table: "participant_sessions",
            column: "expires_at");

        migrationBuilder.CreateIndex(
            name: "IX_participant_sessions_jti",
            table: "participant_sessions",
            column: "jti",
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_participant_sessions_meeting_id_participant_id_revoked_at_ex~",
            table: "participant_sessions",
            columns: new[] { "meeting_id", "participant_id", "revoked_at", "expires_at" });
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(
            name: "participant_sessions");
    }
}
