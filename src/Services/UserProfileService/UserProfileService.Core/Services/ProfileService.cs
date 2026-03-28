using Shared.Common;
using UserProfileService.Core.DTOs;
using UserProfileService.Core.Interfaces;

namespace UserProfileService.Core.Services;

public class ProfileService : IProfileService
{
    private readonly IProfileRepository _profiles;

    public ProfileService(IProfileRepository profiles)
    {
        _profiles = profiles;
    }

    public async Task<Result<ProfileDto>> GetProfileAsync(Guid userId)
    {
        var profile = await _profiles.GetByUserIdAsync(userId);
        if (profile is null)
            return Result<ProfileDto>.Failure("Profile not found.");

        return Result<ProfileDto>.Success(MapToDto(profile));
    }

    public async Task<Result<ProfileDto>> UpdateProfileAsync(Guid userId, UpdateProfileDto dto)
    {
        var profile = await _profiles.GetByUserIdAsync(userId);
        if (profile is null)
            return Result<ProfileDto>.Failure("Profile not found.");

        if (!string.IsNullOrWhiteSpace(dto.Phone))       profile.Phone       = dto.Phone;
        if (!string.IsNullOrWhiteSpace(dto.Address))     profile.Address     = dto.Address;
        if (!string.IsNullOrWhiteSpace(dto.DateOfBirth)) profile.DateOfBirth = dto.DateOfBirth;
        profile.UpdatedAt = DateTime.UtcNow;

        await _profiles.SaveChangesAsync();
        return Result<ProfileDto>.Success(MapToDto(profile));
    }

    private static ProfileDto MapToDto(Entities.UserProfile p) => new()
    {
        UserId      = p.UserId,
        Email       = p.Email,
        FullName    = p.FullName,
        Phone       = p.Phone,
        Address     = p.Address,
        DateOfBirth = p.DateOfBirth,
        KycStatus   = p.KycDocument?.Status
    };
}