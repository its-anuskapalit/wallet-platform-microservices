using CatalogService.Core.Enums;
using Shared.Common;

namespace CatalogService.Core.Entities;

public class Redemption : BaseEntity
{
    public Guid UserId { get; set; }
    public Guid CatalogItemId { get; set; }
    public CatalogItem CatalogItem { get; set; } = null!;
    public int PointsUsed { get; set; }
    public RedemptionStatus Status { get; set; } = RedemptionStatus.Pending;
    public string? FailureReason { get; set; }
    public string? VoucherCode { get; set; }
}