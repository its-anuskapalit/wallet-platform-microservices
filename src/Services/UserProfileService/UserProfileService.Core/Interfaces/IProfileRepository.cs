using UserProfileService.Core.Entities;

namespace UserProfileService.Core.Interfaces;

public interface IProfileRepository
{
    Task<UserProfile?> GetByUserIdAsync(Guid userId);
    Task<bool> ExistsByUserIdAsync(Guid userId);
    Task AddAsync(UserProfile profile);
    Task SaveChangesAsync();
}