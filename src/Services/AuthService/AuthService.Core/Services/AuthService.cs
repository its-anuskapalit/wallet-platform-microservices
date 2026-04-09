using AuthService.Core.DTOs;
using AuthService.Core.Entities;
using AuthService.Core.Interfaces;
using BCrypt.Net;
using Shared.Common;
using Shared.Contracts.Events;
using Shared.EventBus;
using Shared.Contracts;

namespace AuthService.Core.Services;
/// <summary>
/// Implements authentication business logic including user registration, login,
/// token rotation, and token revocation. Publishes a <c>UserRegisteredEvent</c> on successful registration.
/// </summary>
public class AuthDomainService : IAuthService
{
    private readonly IUserRepository _users; //interface not AuthRepo
    private readonly ITokenService _tokens;
    private readonly IEventPublisher _publisher;
    // Core has ZERO knowledge of SQL Server, EF, or RabbitMQ
    /// <summary>
    /// Initializes a new instance of <see cref="AuthDomainService"/>.
    /// </summary>
    /// <param name="users">Repository for user and refresh-token persistence.</param>
    /// <param name="tokens">Service for generating access and refresh tokens.</param>
    /// <param name="publisher">Event publisher for broadcasting domain events.</param>
    public AuthDomainService(IUserRepository users, ITokenService tokens, IEventPublisher publisher)
    {
        _users = users;
        _tokens = tokens;
        _publisher = publisher;
    }

    /// <summary>
    /// Registers a new user, creates an initial refresh token, persists both,
    /// and publishes a <c>UserRegisteredEvent</c> to notify downstream services.
    /// </summary>
    /// <param name="dto">Registration payload containing email, password, full name, and phone.</param>
    /// <returns>
    /// A successful result with auth tokens if registration succeeds;
    /// a failure result if the email is already taken.
    /// </returns>
    /// step 1 - business rule: check for duplicate email 
    public async Task<Result<AuthResponseDto>> RegisterAsync(RegisterRequestDto dto)
    {
        if (await _users.ExistsByEmailAsync(dto.Email))
        {
            return Result<AuthResponseDto>.Failure("Email already registered.");
        }
        //step 2 - map DTO  → entity, apply business logic during mapping
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
            EventQueues.UserExchange,routingKey: "user.registered");
        return Result<AuthResponseDto>.Success(BuildResponse(user, refreshToken.Token));
    }
    
    /// <summary>
    /// Validates the user's credentials, issues a new refresh token, and returns auth tokens.
    /// </summary>
    /// <param name="dto">Login credentials containing email and password.</param>
    /// <returns>
    /// A successful result with auth tokens on valid credentials;
    /// a failure result if credentials are incorrect or the account is deactivated.
    /// </returns>
    public async Task<Result<AuthResponseDto>> LoginAsync(LoginRequestDto dto)
    {
        var user = await _users.GetByEmailAsync(dto.Email.ToLowerInvariant().Trim());

        if (user is null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
        {
            return Result<AuthResponseDto>.Failure("Invalid email or password.");
        }
        if (!user.IsActive)
        {
            return Result<AuthResponseDto>.Failure("Account is deactivated.");
        }
        var refreshToken = CreateRefreshToken(user.Id);
        await _users.AddRefreshTokenAsync(refreshToken);
        await _users.SaveChangesAsync();
        return Result<AuthResponseDto>.Success(BuildResponse(user, refreshToken.Token));
    }

    /// <summary>
    /// Rotates the provided refresh token: revokes it and issues a replacement,
    /// then returns a fresh set of auth tokens.
    /// </summary>
    /// <param name="token">The current, unexpired refresh token.</param>
    /// <returns>
    /// A successful result with new auth tokens;
    /// a failure result if the token does not exist or is already revoked/expired.
    /// </returns>
    public async Task<Result<AuthResponseDto>> RefreshTokenAsync(string token)
    {
        var existing = await _users.GetRefreshTokenAsync(token);

        if (existing is null || !existing.IsActive)
        {
            return Result<AuthResponseDto>.Failure("Invalid or expired refresh token.");
        }
        var newRefreshToken = CreateRefreshToken(existing.UserId);
        await _users.RevokeRefreshTokenAsync(existing, replacedBy: newRefreshToken.Token);
        await _users.AddRefreshTokenAsync(newRefreshToken);
        await _users.SaveChangesAsync();

        return Result<AuthResponseDto>.Success(BuildResponse(existing.User, newRefreshToken.Token));
    }

    /// <summary>Marks the specified refresh token as revoked so it cannot be used again.</summary>
    /// <param name="token">The refresh token to revoke.</param>
    /// <returns>
    /// A success result if the token was revoked;
    /// a failure result if the token was not found or is already inactive.
    /// </returns>
    public async Task<Result> RevokeTokenAsync(string token)
    {
        var existing = await _users.GetRefreshTokenAsync(token);

        if (existing is null || !existing.IsActive)
        {
            return Result.Failure("Token not found or already revoked.");
        }
        await _users.RevokeRefreshTokenAsync(existing);
        await _users.SaveChangesAsync();

        return Result.Success();
    }

    /// <summary>Verifies the current password, then sets a new bcrypt hash.</summary>
    public async Task<Result> ChangePasswordAsync(Guid userId, ChangePasswordDto dto)
    {
        var user = await _users.GetByIdAsync(userId);
        if (user is null)
            return Result.Failure("User not found.");

        if (!BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, user.PasswordHash))
            return Result.Failure("Current password is incorrect.");

        if (dto.NewPassword.Length < 8)
            return Result.Failure("New password must be at least 8 characters.");

        var newHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
        await _users.UpdatePasswordHashAsync(userId, newHash);
        await _users.SaveChangesAsync();

        return Result.Success();
    }

    // ── Helpers ──────────────────────────────────────────────────

    /// <summary>Creates a new <see cref="RefreshToken"/> entity with a generated token and expiry for the given user.</summary>
    /// <param name="userId">The ID of the user the token is issued for.</param>
    private RefreshToken CreateRefreshToken(Guid userId) => new()
    {
        Token = _tokens.GenerateRefreshToken(),
        ExpiresAt = _tokens.GetRefreshTokenExpiry(),
        UserId = userId
    };

    /// <summary>Builds the <see cref="AuthResponseDto"/> returned to the caller after a successful auth operation.</summary>
    /// <param name="user">The authenticated user.</param>
    /// <param name="refreshToken">The newly issued refresh token string.</param>
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