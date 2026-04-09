namespace CatalogService.Core.DTOs;

public class RedemptionDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid CatalogItemId { get; set; }
    public string ItemName { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public int PointsUsed { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? VoucherCode { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateRedemptionDto
{
    public Guid CatalogItemId { get; set; }
}