// IAuthService.cs
using AuthService.Core.DTOs;
using Shared.Common;
namespace AuthService.Core.Interfaces;

/// <summary>
/// Defines the authentication operations available in the Auth domain.
/// </summary>
public interface IAuthService
{
    /// <summary>Registers a new user, hashes their password, and issues initial tokens.</summary>
    /// <param name="dto">Registration payload containing email, password, full name, and phone.</param>
    /// <returns>A result containing auth tokens and user info, or an error message.</returns>
    Task<Result<AuthResponseDto>> RegisterAsync(RegisterRequestDto dto);

    /// <summary>Authenticates a user by email and password and issues fresh tokens.</summary>
    /// <param name="dto">Login credentials.</param>
    /// <returns>A result containing auth tokens and user info, or an error message.</returns>
    Task<Result<AuthResponseDto>> LoginAsync(LoginRequestDto dto);

    /// <summary>Rotates a refresh token, revoking the old one and issuing a new pair of tokens.</summary>
    /// <param name="refreshToken">The current, unexpired refresh token.</param>
    /// <returns>A result containing new auth tokens, or an error if the token is invalid or expired.</returns>
    Task<Result<AuthResponseDto>> RefreshTokenAsync(string refreshToken);

    /// <summary>Revokes a refresh token so it can no longer be used to issue new access tokens.</summary>
    /// <param name="refreshToken">The refresh token to revoke.</param>
    /// <returns>A success result, or a failure if the token was not found or already revoked.</returns>
    Task<Result> RevokeTokenAsync(string refreshToken);   // non-generic Result
}