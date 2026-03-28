namespace CatalogService.Core.DTOs;

public class CatalogItemDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int PointsRequired { get; set; }
    public string Category { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public int Stock { get; set; }
}

public class CreateCatalogItemDto
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int PointsRequired { get; set; }
    public string Category { get; set; } = string.Empty;
    public int Stock { get; set; }
}