using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using AuthService.Core.Entities;
using AuthService.Core.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace AuthService.Core.Services;

/// <summary>
/// Generates JWT access tokens and cryptographically random refresh tokens
/// using configuration-supplied signing keys and expiry settings.
/// </summary>
public class TokenService : ITokenService
{
    private readonly IConfiguration _config;

    /// <summary>
    /// Initializes a new instance of <see cref="TokenService"/>.
    /// </summary>
    /// <param name="config">Application configuration providing JWT key, issuer, audience, and expiry.</param>
    public TokenService(IConfiguration config)
    {
        _config = config;
    }

    /// <summary>
    /// Generates a signed HS256 JWT containing the user's id, email, role, and full name claims.
    /// </summary>
    /// <param name="user">The user whose claims are embedded in the token.</param>
    /// <returns>A compact JWT string.</returns>
    public string GenerateAccessToken(User user)
    {
        var key   = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub,   user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(JwtRegisteredClaimNames.Jti,   Guid.NewGuid().ToString()),
            new Claim(ClaimTypes.Role,               user.Role.ToString()),
            new Claim("fullName",                    user.FullName)
        };

        var expiry = DateTime.UtcNow.AddMinutes(
            double.Parse(_config["Jwt:ExpiryMinutes"] ?? "60"));

        var token = new JwtSecurityToken(
            issuer:             _config["Jwt:Issuer"],
            audience:           _config["Jwt:Audience"],
            claims:             claims,
            expires:            expiry,
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    /// <summary>
    /// Generates a 64-byte cryptographically random refresh token encoded as a Base64 string.
    /// </summary>
    /// <returns>A Base64-encoded random string.</returns>
    public string GenerateRefreshToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(64);
        return Convert.ToBase64String(bytes);
    }

    /// <summary>Returns the UTC expiry date-time for a refresh token (7 days from now).</summary>
    /// <returns>A <see cref="DateTime"/> 7 days in the future (UTC).</returns>
    public DateTime GetRefreshTokenExpiry() => DateTime.UtcNow.AddDays(7);
}