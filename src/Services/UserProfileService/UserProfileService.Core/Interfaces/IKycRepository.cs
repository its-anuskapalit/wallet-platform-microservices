using UserProfileService.Core.Entities;

namespace UserProfileService.Core.Interfaces;

public interface IKycRepository
{
    Task<KycDocument?> GetByUserProfileIdAsync(Guid userProfileId);
    Task AddAsync(KycDocument document);
    Task SaveChangesAsync();
}