using UserProfileService.Core.Enums;
namespace UserProfileService.Core.DTOs;
public class KycReviewDto
{
    public bool Approve { get; set; } // must be Approved or Rejected
    public string? RejectionReason { get; set; } // "Document unclear, resubmit"
}