using Shared.Common;

namespace AdminService.Core.Entities;

public class FraudFlag : BaseEntity
{
    public Guid TransactionId { get; set; }
    public Guid FlaggedByUserId { get; set; }
    public string Reason { get; set; } = string.Empty;
    public bool IsResolved { get; set; } = false;
    public string? Resolution { get; set; }
    public DateTime? ResolvedAt { get; set; }
}