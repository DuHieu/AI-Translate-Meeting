using AITranslateMeeting.Api.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITranslateMeeting.Api.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20261004101500_AddMeetingMinutes")]
public partial class AddMeetingMinutes : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "meeting_minutes",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                meeting_id = table.Column<Guid>(type: "uuid", nullable: false),
                title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                summary = table.Column<string>(type: "text", nullable: false),
                markdown_content = table.Column<string>(type: "text", nullable: false),
                decisions_json = table.Column<string>(type: "jsonb", nullable: false),
                action_items_json = table.Column<string>(type: "jsonb", nullable: false),
                created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_meeting_minutes", x => x.id);
                table.ForeignKey(
                    name: "FK_meeting_minutes_meetings_meeting_id",
                    column: x => x.meeting_id,
                    principalTable: "meetings",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "IX_meeting_minutes_meeting_id",
            table: "meeting_minutes",
            column: "meeting_id",
            unique: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "meeting_minutes");
    }
}
