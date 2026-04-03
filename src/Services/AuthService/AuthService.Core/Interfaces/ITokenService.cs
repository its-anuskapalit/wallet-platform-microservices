// ITokenService.cs
using AuthService.Core.Entities;
namespace AuthService.Core.Interfaces;

/// <summary>
/// Defines token generation and expiry operations for authentication.
/// </summary>
public interface ITokenService
{
    /// <summary>Generates a signed JWT access token containing the user's claims.</summary>
    /// <param name="user">The authenticated user whose claims are embedded in the token.</param>
    /// <returns>A signed JWT string.</returns>
    string GenerateAccessToken(User user);

    /// <summary>Generates a cryptographically random refresh token.</summary>
    /// <returns>A Base64-encoded random string suitable for use as a refresh token.</returns>
    string GenerateRefreshToken();

    /// <summary>Returns the absolute expiry date-time for a newly issued refresh token.</summary>
    /// <returns>The UTC date-time at which the refresh token expires.</returns>
    DateTime GetRefreshTokenExpiry();
}