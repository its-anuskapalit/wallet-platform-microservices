using CatalogService.Core.DTOs;
using CatalogService.Core.Entities;
using CatalogService.Core.Interfaces;
using Shared.Common;

namespace CatalogService.Core.Services;

/// <summary>
/// Implements catalog management operations for retrieving and creating reward catalog items.
/// </summary>
public class CatalogDomainService : ICatalogService
{
    private readonly ICatalogRepository _catalog;

    /// <summary>
    /// Initializes a new instance of <see cref="CatalogDomainService"/>.
    /// </summary>
    /// <param name="catalog">Repository for catalog item persistence.</param>
    public CatalogDomainService(ICatalogRepository catalog)
    {
        _catalog = catalog;
    }

    /// <summary>Retrieves all active catalog items available for redemption.</summary>
    /// <returns>A successful result containing the list of active catalog items.</returns>
    public async Task<Result<IEnumerable<CatalogItemDto>>> GetAllAsync()
    {
        var items = await _catalog.GetAllActiveAsync();
        return Result<IEnumerable<CatalogItemDto>>.Success(items.Select(MapToDto));
    }

    /// <summary>Creates and persists a new catalog item, setting it as active by default.</summary>
    /// <param name="dto">Catalog item details including name, description, points required, category, and stock.</param>
    /// <returns>A successful result with the created catalog item.</returns>
    public async Task<Result<CatalogItemDto>> CreateAsync(CreateCatalogItemDto dto)
    {
        var item = new CatalogItem
        {
            Name           = dto.Name,
            Description    = dto.Description,
            PointsRequired = dto.PointsRequired,
            Category       = dto.Category,
            Stock          = dto.Stock,
            IsActive       = true
        };

        await _catalog.AddAsync(item);
        await _catalog.SaveChangesAsync();
        return Result<CatalogItemDto>.Success(MapToDto(item));
    }

    /// <summary>Maps a <see cref="CatalogItem"/> entity to a <see cref="CatalogItemDto"/> for API responses.</summary>
    private static CatalogItemDto MapToDto(CatalogItem i) => new()
    {
        Id             = i.Id,
        Name           = i.Name,
        Description    = i.Description,
        PointsRequired = i.PointsRequired,
        Category       = i.Category,
        IsActive       = i.IsActive,
        Stock          = i.Stock
    };
}