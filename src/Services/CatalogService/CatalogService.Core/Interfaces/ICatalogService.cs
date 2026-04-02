using CatalogService.Core.DTOs;
using Shared.Common;

namespace CatalogService.Core.Interfaces;

/// <summary>
/// Defines catalog management operations for retrieving and creating reward items.
/// </summary>
public interface ICatalogService
{
    /// <summary>Retrieves all active catalog items available for redemption.</summary>
    Task<Result<IEnumerable<CatalogItemDto>>> GetAllAsync();

    /// <summary>Creates and persists a new catalog item.</summary>
    Task<Result<CatalogItemDto>> CreateAsync(CreateCatalogItemDto dto);
}