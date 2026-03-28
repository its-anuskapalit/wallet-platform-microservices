using UserProfileService.Core.Enums;

namespace UserProfileService.Core.DTOs;

public class ProfileDto
{
    public Guid UserId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? DateOfBirth { get; set; }
    public KycStatus? KycStatus { get; set; }
}

public class UpdateProfileDto
{
    public string? Address { get; set; }
    public string? DateOfBirth { get; set; }
    public string? Phone { get; set; }
}

public class KycSubmitDto
{
    public string DocumentType { get; set; } = string.Empty;
    public string DocumentNumber { get; set; } = string.Empty;
}

public class KycReviewDto
{
    public bool Approve { get; set; }
    public string? RejectionReason { get; set; }
}