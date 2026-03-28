// IAuthService.cs
using AuthService.Core.DTOs;
using Shared.Common;

namespace AuthService.Core.Interfaces;

public interface IAuthService
{
    Task<Result<AuthResponseDto>> RegisterAsync(RegisterRequestDto dto);
    Task<Result<AuthResponseDto>> LoginAsync(LoginRequestDto dto);
    Task<Result<AuthResponseDto>> RefreshTokenAsync(string refreshToken);
    Task<Result> RevokeTokenAsync(string refreshToken);   // non-generic Result
}