// ITokenService.cs
using AuthService.Core.Entities;

namespace AuthService.Core.Interfaces;

public interface ITokenService
{
    string GenerateAccessToken(User user);
    string GenerateRefreshToken();
    DateTime GetRefreshTokenExpiry();
}