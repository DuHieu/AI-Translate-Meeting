using AITranslateMeeting.Api.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITranslateMeeting.Api.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20261006010000_AddSmartSchedulingAndRsvp")]
public partial class AddSmartSchedulingAndRsvp : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "agenda",
            table: "meetings",
            type: "character varying(2000)",
            maxLength: 2000,
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "default_spoken_language",
            table: "meetings",
            type: "character varying(10)",
            maxLength: 10,
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "default_target_language",
            table: "meetings",
            type: "character varying(10)",
            maxLength: 10,
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "domain_glossary",
            table: "meetings",
            type: "character varying(64)",
            maxLength: 64,
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "host_email",
            table: "meetings",
            type: "character varying(254)",
            maxLength: 254,
            nullable: true);

        migrationBuilder.AddColumn<DateTime>(
            name: "scheduled_end_at",
            table: "meetings",
            type: "timestamp with time zone",
            nullable: true);

        migrationBuilder.AddColumn<DateTime>(
            name: "scheduled_start_at",
            table: "meetings",
            type: "timestamp with time zone",
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "timezone",
            table: "meetings",
            type: "character varying(64)",
            maxLength: 64,
            nullable: true);

        migrationBuilder.CreateTable(
            name: "meeting_rsvps",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                meeting_id = table.Column<Guid>(type: "uuid", nullable: false),
                display_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                email = table.Column<string>(type: "character varying(254)", maxLength: 254, nullable: true),
                status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                spoken_language = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                target_language = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                admission_id = table.Column<Guid>(type: "uuid", nullable: true),
                created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_meeting_rsvps", x => x.id);
                table.ForeignKey(
                    name: "FK_meeting_rsvps_meeting_admissions_admission_id",
                    column: x => x.admission_id,
                    principalTable: "meeting_admissions",
                    principalColumn: "id",
                    onDelete: ReferentialAction.SetNull);
                table.ForeignKey(
                    name: "FK_meeting_rsvps_meetings_meeting_id",
                    column: x => x.meeting_id,
                    principalTable: "meetings",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "IX_meeting_rsvps_admission_id",
            table: "meeting_rsvps",
            column: "admission_id");

        migrationBuilder.CreateIndex(
            name: "IX_meeting_rsvps_meeting_id_email",
            table: "meeting_rsvps",
            columns: new[] { "meeting_id", "email" },
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_meetings_ended_at",
            table: "meetings",
            column: "ended_at");

        migrationBuilder.CreateIndex(
            name: "IX_meetings_host_email",
            table: "meetings",
            column: "host_email");

        migrationBuilder.CreateIndex(
            name: "IX_meetings_scheduled_start_at",
            table: "meetings",
            column: "scheduled_start_at");

        migrationBuilder.CreateIndex(
            name: "IX_participant_sessions_participant_id",
            table: "participant_sessions",
            column: "participant_id");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "meeting_rsvps");

        migrationBuilder.DropIndex(name: "IX_meetings_ended_at", table: "meetings");
        migrationBuilder.DropIndex(name: "IX_meetings_host_email", table: "meetings");
        migrationBuilder.DropIndex(name: "IX_meetings_scheduled_start_at", table: "meetings");
        migrationBuilder.DropIndex(name: "IX_participant_sessions_participant_id", table: "participant_sessions");

        migrationBuilder.DropColumn(name: "agenda", table: "meetings");
        migrationBuilder.DropColumn(name: "default_spoken_language", table: "meetings");
        migrationBuilder.DropColumn(name: "default_target_language", table: "meetings");
        migrationBuilder.DropColumn(name: "domain_glossary", table: "meetings");
        migrationBuilder.DropColumn(name: "host_email", table: "meetings");
        migrationBuilder.DropColumn(name: "scheduled_end_at", table: "meetings");
        migrationBuilder.DropColumn(name: "scheduled_start_at", table: "meetings");
        migrationBuilder.DropColumn(name: "timezone", table: "meetings");
    }
}
