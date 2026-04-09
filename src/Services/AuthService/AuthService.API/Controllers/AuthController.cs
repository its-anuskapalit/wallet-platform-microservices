using System.Security.Claims;
using AuthService.Core.DTOs;
using AuthService.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AuthService.API.Controllers;

/// <summary>
/// Exposes authentication endpoints for user registration, login, token refresh, and revocation.
/// </summary>
[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _auth;
    private readonly IOtpService _otp;
    private readonly ILogger<AuthController> _logger;
    private readonly IWebHostEnvironment _env;

    public AuthController(
        IAuthService auth,
        IOtpService otp,
        ILogger<AuthController> logger,
        IWebHostEnvironment env)
    {
        _auth   = auth;
        _otp    = otp;
        _logger = logger;
        _env    = env;
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
           { 
            return Unauthorized(new { error = result.Error });
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

    /// <summary>Changes the currently authenticated user's password.</summary>
    [Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
    {
        var userId = Guid.Parse(
            User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")!);
        var result = await _auth.ChangePasswordAsync(userId, dto);
        if (!result.IsSuccess) return BadRequest(new { error = result.Error });
        return NoContent();
    }

    /// <summary>
    /// Sends a 6-digit OTP to the provided phone number.
    /// In Development, the OTP code is returned in the response body for easy testing.
    /// </summary>
    [HttpPost("send-otp")]
    public async Task<IActionResult> SendOtp([FromBody] SendOtpDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Email))
            return BadRequest(new { error = "Email is required to send OTP." });

        var result = await _otp.SendOtpAsync(dto.Phone, dto.Email, _env.IsDevelopment());
        if (!result.IsSuccess) return BadRequest(new { error = result.Error });
        return Ok(result.Data);
    }

    /// <summary>Verifies the OTP entered by the user for the given phone number.</summary>
    [HttpPost("verify-otp")]
    public async Task<IActionResult> VerifyOtp([FromBody] VerifyOtpDto dto)
    {
        var result = await _otp.VerifyOtpAsync(dto.Phone, dto.OtpCode);
        if (!result.IsSuccess) return BadRequest(new { error = result.Error });
        return Ok(new { verified = true, message = "Phone number verified successfully." });
    }

    /// <summary>Verifies that the caller has the Admin role.</summary>
    [Authorize(Roles = "Admin")]
    [HttpGet("admin-only")]
    public IActionResult AdminOnly() => Ok(new { message = "You are an admin." });
}