using CatalogService.Core.DTOs;
using CatalogService.Core.Entities;
using CatalogService.Core.Interfaces;
using Shared.Common;

namespace CatalogService.Core.Services;

public class CatalogDomainService : ICatalogService
{
    private readonly ICatalogRepository _catalog;

    public CatalogDomainService(ICatalogRepository catalog)
    {
        _catalog = catalog;
    }

    public async Task<Result<IEnumerable<CatalogItemDto>>> GetAllAsync()
    {
        var items = await _catalog.GetAllActiveAsync();
        return Result<IEnumerable<CatalogItemDto>>.Success(items.Select(MapToDto));
    }

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