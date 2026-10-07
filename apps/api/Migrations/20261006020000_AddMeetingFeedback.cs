using System;
using AITranslateMeeting.Api.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITranslateMeeting.Api.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20261006020000_AddMeetingFeedback")]
public partial class AddMeetingFeedback : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "meeting_feedbacks",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                meeting_id = table.Column<Guid>(type: "uuid", nullable: true),
                meeting_code = table.Column<string>(type: "character varying(12)", maxLength: 12, nullable: false),
                rating = table.Column<int>(type: "integer", nullable: false),
                category = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                comment = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                user_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                user_email = table.Column<string>(type: "character varying(254)", maxLength: 254, nullable: true),
                created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_meeting_feedbacks", x => x.id);
                table.ForeignKey(
                    name: "FK_meeting_feedbacks_meetings_meeting_id",
                    column: x => x.meeting_id,
                    principalTable: "meetings",
                    principalColumn: "id",
                    onDelete: ReferentialAction.SetNull);
            });

        migrationBuilder.CreateIndex(
            name: "IX_meeting_feedbacks_meeting_code",
            table: "meeting_feedbacks",
            column: "meeting_code");

        migrationBuilder.CreateIndex(
            name: "IX_meeting_feedbacks_created_at",
            table: "meeting_feedbacks",
            column: "created_at");

        migrationBuilder.CreateIndex(
            name: "IX_meeting_feedbacks_meeting_id",
            table: "meeting_feedbacks",
            column: "meeting_id");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "meeting_feedbacks");
    }
}
