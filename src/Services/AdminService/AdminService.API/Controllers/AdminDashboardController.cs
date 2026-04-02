using AdminService.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AdminService.API.Controllers;

/// <summary>
/// Provides admin-only endpoints for retrieving platform dashboard statistics.
/// </summary>
[ApiController]
[Route("api/admin/dashboard")]
[Authorize(Roles = "Admin")]
public class AdminDashboardController : ControllerBase
{
    private readonly IAdminService _adminService;

    /// <summary>
    /// Initializes a new instance of <see cref="AdminDashboardController"/>.
    /// </summary>
    /// <param name="adminService">The admin domain service.</param>
    public AdminDashboardController(IAdminService adminService)
    {
        _adminService = adminService;
    }

    /// <summary>Returns a summary of fraud-flag statistics for the admin dashboard.</summary>
    /// <returns>200 with dashboard data including total and unresolved fraud flag counts.</returns>
    [HttpGet]
    public async Task<IActionResult> GetDashboard()
    {
        var result = await _adminService.GetDashboardAsync();
        return Ok(result.Data);
    }
}