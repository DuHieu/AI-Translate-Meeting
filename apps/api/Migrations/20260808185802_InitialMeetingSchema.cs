using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITranslateMeeting.Api.Migrations
{
    /// <inheritdoc />
    public partial class InitialMeetingSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "meetings",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    meeting_code = table.Column<string>(type: "character varying(12)", maxLength: 12, nullable: false),
                    room_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ended_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_meetings", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "meeting_participants",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    meeting_id = table.Column<Guid>(type: "uuid", nullable: false),
                    identity = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    display_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    spoken_language = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    target_language = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    joined_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    left_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_meeting_participants", x => x.id);
                    table.ForeignKey(
                        name: "FK_meeting_participants_meetings_meeting_id",
                        column: x => x.meeting_id,
                        principalTable: "meetings",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_meeting_participants_identity",
                table: "meeting_participants",
                column: "identity");

            migrationBuilder.CreateIndex(
                name: "IX_meeting_participants_meeting_id",
                table: "meeting_participants",
                column: "meeting_id");

            migrationBuilder.CreateIndex(
                name: "IX_meetings_meeting_code",
                table: "meetings",
                column: "meeting_code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_meetings_room_name",
                table: "meetings",
                column: "room_name",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "meeting_participants");

            migrationBuilder.DropTable(
                name: "meetings");
        }
    }
}
