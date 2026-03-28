using Microsoft.EntityFrameworkCore;
using UserProfileService.Core.Entities;
using UserProfileService.Core.Interfaces;
using UserProfileService.Infrastructure.Data;

namespace UserProfileService.Infrastructure.Repositories;

public class ProfileRepository : IProfileRepository
{
    private readonly UserProfileDbContext _db;

    public ProfileRepository(UserProfileDbContext db)
    {
        _db = db;
    }

    public async Task<UserProfile?> GetByUserIdAsync(Guid userId) =>
        await _db.UserProfiles
            .Include(p => p.KycDocument)
            .FirstOrDefaultAsync(p => p.UserId == userId);

    public async Task<bool> ExistsByUserIdAsync(Guid userId) =>
        await _db.UserProfiles.AnyAsync(p => p.UserId == userId);

    public async Task AddAsync(UserProfile profile) =>
        await _db.UserProfiles.AddAsync(profile);

    public async Task SaveChangesAsync() =>
        await _db.SaveChangesAsync();
}