using UserProfileService.Core.Enums;
namespace UserProfileService.Core.DTOs;
public class KycSubmitDto
{
    public string DocumentType { get; set; } = string.Empty;
    public string DocumentNumber { get; set; } = string.Empty;
}