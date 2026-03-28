using CatalogService.Core.DTOs;
using Shared.Common;

namespace CatalogService.Core.Interfaces;

public interface ICatalogService
{
    Task<Result<IEnumerable<CatalogItemDto>>> GetAllAsync();
    Task<Result<CatalogItemDto>> CreateAsync(CreateCatalogItemDto dto);
}