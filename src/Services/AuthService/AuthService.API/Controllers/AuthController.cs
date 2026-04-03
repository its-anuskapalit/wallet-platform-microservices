using AuthService.Core.DTOs;
using AuthService.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
//Http- Service - maps result to http response
namespace AuthService.API.Controllers;

/// <summary>
/// Exposes authentication endpoints for user registration, login, token refresh, and revocation.
/// </summary>
[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _auth;
    private readonly ILogger<AuthController> _logger;
    /// <summary>
    /// Initializes a new instance of <see cref="AuthController"/>.
    /// </summary>
    /// <param name="auth">The authentication domain service.</param>
    /// <param name="logger">Logger for recording auth events.</param>
    public AuthController(IAuthService auth, ILogger<AuthController> logger)
    {
        _auth = auth;
        _logger = logger;
    }

    /// <summary>Registers a new user account and returns auth tokens.</summary>
    /// <param name="dto">Registration payload.</param>
    /// <returns>201 with auth tokens on success; 409 if the email is already registered.</returns>
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequestDto dto)
    {
        var result = await _auth.RegisterAsync(dto);
        if (!result.IsSuccess)
        {
            _logger.LogWarning("Registration failed for {Email}: {Error}", dto.Email, result.Error);
            return Conflict(new { error = result.Error });
        }
        return CreatedAtAction(nameof(Register), result.Data);
    }

    /// <summary>Authenticates a user and returns access and refresh tokens.</summary>
    /// <param name="dto">Login credentials.</param>
    /// <returns>200 with tokens on success; 401 on invalid credentials or deactivated account.</returns>
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequestDto dto)
    {
        var result = await _auth.LoginAsync(dto);
        if (!result.IsSuccess)
        {
            _logger.LogWarning("Login failed for {Email}", dto.Email);
            return Unauthorized(new { error = result.Error });
        }
        return Ok(result.Data);
    }

    /// <summary>Rotates a refresh token and issues a new token pair.</summary>
    /// <param name="dto">The current refresh token.</param>
    /// <returns>200 with new tokens; 401 if the token is invalid or expired.</returns>
    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromBody] RefreshTokenRequestDto dto)
    {
        var result = await _auth.RefreshTokenAsync(dto.RefreshToken);
        if (!result.IsSuccess)
           { return Unauthorized(new { error = result.Error });
           }
        return Ok(result.Data);
    }
    /// <summary>Revokes a refresh token, preventing it from being used for future token exchanges.</summary>
    /// <param name="dto">The refresh token to revoke.</param>
    /// <returns>204 on success; 400 if the token was not found or already revoked.</returns>
    [Authorize]
    [HttpPost("revoke")]
    public async Task<IActionResult> Revoke([FromBody] RefreshTokenRequestDto dto)
    {
        var result = await _auth.RevokeTokenAsync(dto.RefreshToken);
        if (!result.IsSuccess)
        {
         return BadRequest(new { error = result.Error });
        }
        return NoContent();
    }

    /// <summary>Returns the identity claims of the currently authenticated user.</summary>
    /// <returns>200 with user id, email, role, and full name extracted from the JWT.</returns>
    [Authorize]
    [HttpGet("me")]
    public IActionResult Me()
    {
        return Ok(new
        {
            UserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value,
            Email = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value,
            Role = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value,
            FullName = User.FindFirst("fullName")?.Value
        });
    }

    /// <summary>Verifies that the caller has the Admin role. Used to test admin-level authorization.</summary>
    /// <returns>200 with a confirmation message if the caller is an admin; 403 otherwise.</returns>
    [Authorize(Roles = "Admin")]
    [HttpGet("admin-only")]
    public IActionResult AdminOnly() => Ok(new { message = "You are an admin." });
}