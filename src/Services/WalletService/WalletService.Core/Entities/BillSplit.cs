using Shared.Common;
namespace WalletService.Core.Entities;

public enum BillSplitStatus { Open, PartiallyPaid, Completed, Cancelled }
public enum ParticipantStatus { Pending, Paid }

public class BillSplit : BaseEntity
{
    public Guid   CreatorUserId { get; set; }
    public string CreatorEmail  { get; set; } = string.Empty;
    public string Title         { get; set; } = string.Empty;
    public decimal TotalAmount  { get; set; }
    public BillSplitStatus Status { get; set; } = BillSplitStatus.Open;
    public List<BillSplitParticipant> Participants { get; set; } = new();
}

public class BillSplitParticipant : BaseEntity
{
    public Guid   BillSplitId { get; set; }
    public BillSplit BillSplit { get; set; } = null!;
    public string Email       { get; set; } = string.Empty;
    public string FullName    { get; set; } = string.Empty;
    public decimal ShareAmount { get; set; }
    public ParticipantStatus Status { get; set; } = ParticipantStatus.Pending;
    public DateTime? PaidAt   { get; set; }
}
