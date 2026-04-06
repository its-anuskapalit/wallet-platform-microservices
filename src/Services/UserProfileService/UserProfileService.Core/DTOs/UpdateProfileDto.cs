using UserProfileService.Core.Enums;
namespace UserProfileService.Core.DTOs;
public class UpdateProfileDto
{
    public string? Address { get; set; }
    public string? DateOfBirth { get; set; }
    public string? Phone { get; set; }
     // KycStatus is NOT here — user cannot set their own KYC status
}