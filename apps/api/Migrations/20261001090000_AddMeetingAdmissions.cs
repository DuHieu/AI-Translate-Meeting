using AITranslateMeeting.Api.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITranslateMeeting.Api.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20261001090000_AddMeetingAdmissions")]
public partial class AddMeetingAdmissions : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "role",
            table: "meeting_participants",
            type: "character varying(20)",
            maxLength: 20,
            nullable: false,
            defaultValue: "participant");

        migrationBuilder.CreateTable(
            name: "meeting_admissions",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                meeting_id = table.Column<Guid>(type: "uuid", nullable: false),
                type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                role = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                display_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                spoken_language = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                target_language = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                expires_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                decided_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                consumed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_meeting_admissions", x => x.id);
                table.ForeignKey(
                    name: "FK_meeting_admissions_meetings_meeting_id",
                    column: x => x.meeting_id,
                    principalTable: "meetings",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "IX_meeting_admissions_expires_at",
            table: "meeting_admissions",
            column: "expires_at");

        migrationBuilder.CreateIndex(
            name: "IX_meeting_admissions_meeting_id_status",
            table: "meeting_admissions",
            columns: new[] { "meeting_id", "status" });
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "meeting_admissions");
        migrationBuilder.DropColumn(name: "role", table: "meeting_participants");
    }
}
