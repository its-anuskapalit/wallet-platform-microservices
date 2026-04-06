using Shared.Common;
using UserProfileService.Core.DTOs;
namespace UserProfileService.Core.Interfaces;
/// <summary>
/// Defines user profile retrieval and update operations.
/// </summary>
public interface IProfileService
{
    /// <summary>Retrieves the profile of the specified user, including KYC status.</summary>
    Task<Result<ProfileDto>> GetProfileAsync(Guid userId);
    /// <summary>Updates mutable profile fields for the specified user.</summary>
    Task<Result<ProfileDto>> UpdateProfileAsync(Guid userId, UpdateProfileDto dto);
}