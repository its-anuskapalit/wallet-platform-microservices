using Shared.Common;
namespace UserProfileService.Core.Entities;
public class UserProfile : BaseEntity
{
    public Guid UserId { get; set; } // links to Auth's User — no FK across DB
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? DateOfBirth { get; set; }
    public KycDocument? KycDocument { get; set; }
}