using AuthService.Core.DTOs;
using AuthService.Core.Entities;
using AuthService.Core.Interfaces;
using BCrypt.Net;
using Shared.Common;
using Shared.Contracts.Events;
using Shared.EventBus;
using Shared.Contracts;

namespace AuthService.Core.Services;

public class AuthDomainService : IAuthService
{
    private readonly IUserRepository _users;
    private readonly ITokenService _tokens;
    private readonly IEventPublisher _publisher;

    public AuthDomainService(
        IUserRepository users,
        ITokenService tokens,
        IEventPublisher publisher)
    {
        _users = users;
        _tokens = tokens;
        _publisher = publisher;
    }

    public async Task<Result<AuthResponseDto>> RegisterAsync(RegisterRequestDto dto)
    {
        if (await _users.ExistsByEmailAsync(dto.Email))
            return Result<AuthResponseDto>.Failure("Email already registered.");

        var user = new User
        {
            Email = dto.Email.ToLowerInvariant().Trim(),
            FullName = dto.FullName.Trim(),
            Phone = dto.Phone.Trim(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            Role = Enums.UserRole.User
        };

        await _users.AddAsync(user);

        var refreshToken = CreateRefreshToken(user.Id);
        await _users.AddRefreshTokenAsync(refreshToken);
        await _users.SaveChangesAsync();

        // Publish event — wallet service and notification service consume this
        await _publisher.PublishAsync(
            new UserRegisteredEvent
            {
                UserId = user.Id,
                Email = user.Email,
                FullName = user.FullName,
                Phone = user.Phone,
                RegisteredAt = DateTime.UtcNow
            },
            EventQueues.UserExchange,
            routingKey: "user.registered");

        return Result<AuthResponseDto>.Success(BuildResponse(user, refreshToken.Token));
    }

    public async Task<Result<AuthResponseDto>> LoginAsync(LoginRequestDto dto)
    {
        var user = await _users.GetByEmailAsync(dto.Email.ToLowerInvariant().Trim());

        if (user is null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            return Result<AuthResponseDto>.Failure("Invalid email or password.");

        if (!user.IsActive)
            return Result<AuthResponseDto>.Failure("Account is deactivated.");

        var refreshToken = CreateRefreshToken(user.Id);
        await _users.AddRefreshTokenAsync(refreshToken);
        await _users.SaveChangesAsync();

        return Result<AuthResponseDto>.Success(BuildResponse(user, refreshToken.Token));
    }

    public async Task<Result<AuthResponseDto>> RefreshTokenAsync(string token)
    {
        var existing = await _users.GetRefreshTokenAsync(token);

        if (existing is null || !existing.IsActive)
            return Result<AuthResponseDto>.Failure("Invalid or expired refresh token.");

        var newRefreshToken = CreateRefreshToken(existing.UserId);
        await _users.RevokeRefreshTokenAsync(existing, replacedBy: newRefreshToken.Token);
        await _users.AddRefreshTokenAsync(newRefreshToken);
        await _users.SaveChangesAsync();

        return Result<AuthResponseDto>.Success(BuildResponse(existing.User, newRefreshToken.Token));
    }

    public async Task<Result> RevokeTokenAsync(string token)
    {
        var existing = await _users.GetRefreshTokenAsync(token);

        if (existing is null || !existing.IsActive)
            return Result.Failure("Token not found or already revoked.");

        await _users.RevokeRefreshTokenAsync(existing);
        await _users.SaveChangesAsync();

        return Result.Success();
    }

    // ── Helpers ──────────────────────────────────────────────────

    private RefreshToken CreateRefreshToken(Guid userId) => new()
    {
        Token = _tokens.GenerateRefreshToken(),
        ExpiresAt = _tokens.GetRefreshTokenExpiry(),
        UserId = userId
    };

    private AuthResponseDto BuildResponse(User user, string refreshToken) => new()
    {
        UserId = user.Id,
        Email = user.Email,
        FullName = user.FullName,
        Role = user.Role.ToString(),
        AccessToken = _tokens.GenerateAccessToken(user),
        RefreshToken = refreshToken,
        AccessTokenExpiry = DateTime.UtcNow.AddMinutes(60)
    };
}