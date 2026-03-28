using Microsoft.EntityFrameworkCore;
using UserProfileService.Core.Entities;
using UserProfileService.Core.Interfaces;
using UserProfileService.Infrastructure.Data;

namespace UserProfileService.Infrastructure.Repositories;

public class KycRepository : IKycRepository
{
    private readonly UserProfileDbContext _db;

    public KycRepository(UserProfileDbContext db)
    {
        _db = db;
    }

    public async Task<KycDocument?> GetByUserProfileIdAsync(Guid userProfileId) =>
        await _db.KycDocuments.FirstOrDefaultAsync(k => k.UserProfileId == userProfileId);

    public async Task AddAsync(KycDocument document) =>
        await _db.KycDocuments.AddAsync(document);

    public async Task SaveChangesAsync() =>
        await _db.SaveChangesAsync();
}