namespace UserProfileService.Core.Enums;
public enum KycStatus
{
    Pending  = 0, //just registered - no document submitted
    Approved = 1, // admin approved 
    Rejected = 2 // admin rejected - user must resubmit
}