using CatalogService.Core.DTOs;
using CatalogService.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CatalogService.API.Controllers;

/// <summary>
/// Exposes reward catalog endpoints for listing items (public) and creating new items (Admin only).
/// </summary>
[ApiController]
[Route("api/catalog")]
public class CatalogController : ControllerBase
{
    private readonly ICatalogService _catalogService;

    /// <summary>
    /// Initializes a new instance of <see cref="CatalogController"/>.
    /// </summary>
    /// <param name="catalogService">The catalog domain service.</param>
    public CatalogController(ICatalogService catalogService)
    {
        _catalogService = catalogService;
    }

    /// <summary>Returns all active catalog items. Accessible without authentication.</summary>
    /// <returns>200 with the list of active catalog items.</returns>
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll()
    {
        var result = await _catalogService.GetAllAsync();
        return Ok(result.Data);
    }

    /// <summary>Creates a new catalog item. Requires the Admin role.</summary>
    /// <param name="dto">Catalog item details including name, points required, and stock.</param>
    /// <returns>201 with the created item; 400 on validation failure.</returns>
    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreateCatalogItemDto dto)
    {
        var result = await _catalogService.CreateAsync(dto);
        if (!result.IsSuccess) return BadRequest(new { error = result.Error });
        return CreatedAtAction(nameof(GetAll), result.Data);
    }
}