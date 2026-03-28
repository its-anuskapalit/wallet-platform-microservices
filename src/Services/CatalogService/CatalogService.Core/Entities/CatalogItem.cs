using Shared.Common;

namespace CatalogService.Core.Entities;

public class CatalogItem : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int PointsRequired { get; set; }
    public string Category { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public int Stock { get; set; } = 0;
}