using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace AITranslateMeeting.Api.Data;

public class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
        optionsBuilder.UseNpgsql("Host=127.0.0.1;Port=5433;Database=ai_translate_meeting;Username=postgres;Password=postgres");

        return new AppDbContext(optionsBuilder.Options);
    }
}
