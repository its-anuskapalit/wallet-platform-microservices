using Shared.Common;
using UserProfileService.Core.DTOs;

namespace UserProfileService.Core.Interfaces;

public interface IProfileService
{
    Task<Result<ProfileDto>> GetProfileAsync(Guid userId);
    Task<Result<ProfileDto>> UpdateProfileAsync(Guid userId, UpdateProfileDto dto);
}