using AuthService.Core.DTOs;
using AuthService.Core.Entities;
using AuthService.Core.Interfaces;
using AuthService.Core.Services;
using FluentAssertions;
using Moq;
using Shared.Contracts.Events;
using Shared.EventBus;

namespace AuthService.Tests;

public class AuthServiceTests
{
    private readonly Mock<IUserRepository> _userRepo;
    private readonly Mock<ITokenService> _tokenService;
    private readonly Mock<IEventPublisher> _publisher;
    private readonly AuthDomainService _sut;

    public AuthServiceTests()
    {
        _userRepo     = new Mock<IUserRepository>();
        _tokenService = new Mock<ITokenService>();
        _publisher    = new Mock<IEventPublisher>();
        _sut          = new AuthDomainService(_userRepo.Object, _tokenService.Object, _publisher.Object);
    }

    // ── Register ──────────────────────────────────────────────────

    [Fact]
    public async Task Register_WithNewEmail_ReturnsSuccess()
    {
        // Arrange
        var dto = new RegisterRequestDto
        {
            Email    = "new@test.com",
            Password = "Test@1234",
            FullName = "Test User",
            Phone    = "9999999999"
        };

        _userRepo.Setup(r => r.ExistsByEmailAsync(dto.Email)).ReturnsAsync(false);
        _userRepo.Setup(r => r.AddAsync(It.IsAny<User>())).Returns(Task.CompletedTask);
        _userRepo.Setup(r => r.AddRefreshTokenAsync(It.IsAny<RefreshToken>())).Returns(Task.CompletedTask);
        _userRepo.Setup(r => r.SaveChangesAsync()).Returns(Task.CompletedTask);
        _tokenService.Setup(t => t.GenerateAccessToken(It.IsAny<User>())).Returns("access-token");
        _tokenService.Setup(t => t.GenerateRefreshToken()).Returns("refresh-token");
        _tokenService.Setup(t => t.GetRefreshTokenExpiry()).Returns(DateTime.UtcNow.AddDays(7));
        _publisher.Setup(p => p.PublishAsync(
            It.IsAny<UserRegisteredEvent>(),
            It.IsAny<string>(),
            It.IsAny<string>())).Returns(Task.CompletedTask);

        // Act
        var result = await _sut.RegisterAsync(dto);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Data!.Email.Should().Be(dto.Email);
        result.Data.AccessToken.Should().Be("access-token");
        result.Data.RefreshToken.Should().Be("refresh-token");
    }

    [Fact]
    public async Task Register_WithDuplicateEmail_ReturnsFailure()
    {
        // Arrange
        var dto = new RegisterRequestDto { Email = "existing@test.com", Password = "Test@1234", FullName = "User", Phone = "123" };
        _userRepo.Setup(r => r.ExistsByEmailAsync(dto.Email)).ReturnsAsync(true);

        // Act
        var result = await _sut.RegisterAsync(dto);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Error.Should().Be("Email already registered.");
    }

    [Fact]
    public async Task Register_PublishesUserRegisteredEvent()
    {
        // Arrange
        var dto = new RegisterRequestDto
        {
            Email    = "new@test.com",
            Password = "Test@1234",
            FullName = "Test User",
            Phone    = "9999999999"
        };

        _userRepo.Setup(r => r.ExistsByEmailAsync(dto.Email)).ReturnsAsync(false);
        _userRepo.Setup(r => r.AddAsync(It.IsAny<User>())).Returns(Task.CompletedTask);
        _userRepo.Setup(r => r.AddRefreshTokenAsync(It.IsAny<RefreshToken>())).Returns(Task.CompletedTask);
        _userRepo.Setup(r => r.SaveChangesAsync()).Returns(Task.CompletedTask);
        _tokenService.Setup(t => t.GenerateAccessToken(It.IsAny<User>())).Returns("token");
        _tokenService.Setup(t => t.GenerateRefreshToken()).Returns("refresh");
        _tokenService.Setup(t => t.GetRefreshTokenExpiry()).Returns(DateTime.UtcNow.AddDays(7));
        _publisher.Setup(p => p.PublishAsync(
            It.IsAny<UserRegisteredEvent>(),
            It.IsAny<string>(),
            It.IsAny<string>())).Returns(Task.CompletedTask);

        // Act
        await _sut.RegisterAsync(dto);

        // Assert — event was published exactly once
        _publisher.Verify(p => p.PublishAsync(
            It.IsAny<UserRegisteredEvent>(),
            It.IsAny<string>(),
            It.IsAny<string>()), Times.Once);
    }

    // ── Login ─────────────────────────────────────────────────────

    [Fact]
    public async Task Login_WithValidCredentials_ReturnsSuccess()
    {
        // Arrange
        var dto = new LoginRequestDto { Email = "user@test.com", Password = "Test@1234" };

        var user = new User
        {
            Id           = Guid.NewGuid(),
            Email        = dto.Email,
            FullName     = "Test User",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            IsActive     = true,
            Role         = AuthService.Core.Enums.UserRole.User
        };

        _userRepo.Setup(r => r.GetByEmailAsync(dto.Email)).ReturnsAsync(user);
        _userRepo.Setup(r => r.AddRefreshTokenAsync(It.IsAny<RefreshToken>())).Returns(Task.CompletedTask);
        _userRepo.Setup(r => r.SaveChangesAsync()).Returns(Task.CompletedTask);
        _tokenService.Setup(t => t.GenerateAccessToken(user)).Returns("access-token");
        _tokenService.Setup(t => t.GenerateRefreshToken()).Returns("refresh-token");
        _tokenService.Setup(t => t.GetRefreshTokenExpiry()).Returns(DateTime.UtcNow.AddDays(7));

        // Act
        var result = await _sut.LoginAsync(dto);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Data!.AccessToken.Should().Be("access-token");
    }

    [Fact]
    public async Task Login_WithWrongPassword_ReturnsFailure()
    {
        // Arrange
        var dto = new LoginRequestDto { Email = "user@test.com", Password = "WrongPassword" };

        var user = new User
        {
            Email        = dto.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("CorrectPassword"),
            IsActive     = true
        };

        _userRepo.Setup(r => r.GetByEmailAsync(dto.Email)).ReturnsAsync(user);

        // Act
        var result = await _sut.LoginAsync(dto);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Error.Should().Be("Invalid email or password.");
    }

    [Fact]
    public async Task Login_WithNonExistentEmail_ReturnsFailure()
    {
        // Arrange
        var dto = new LoginRequestDto { Email = "ghost@test.com", Password = "Test@1234" };
        _userRepo.Setup(r => r.GetByEmailAsync(dto.Email)).ReturnsAsync((User?)null);

        // Act
        var result = await _sut.LoginAsync(dto);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Error.Should().Be("Invalid email or password.");
    }

    [Fact]
    public async Task Login_WithDeactivatedAccount_ReturnsFailure()
    {
        // Arrange
        var dto = new LoginRequestDto { Email = "user@test.com", Password = "Test@1234" };

        var user = new User
        {
            Email        = dto.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            IsActive     = false
        };

        _userRepo.Setup(r => r.GetByEmailAsync(dto.Email)).ReturnsAsync(user);

        // Act
        var result = await _sut.LoginAsync(dto);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Error.Should().Be("Account is deactivated.");
    }

    // ── Refresh Token ─────────────────────────────────────────────

    [Fact]
    public async Task RefreshToken_WithValidToken_ReturnsNewTokens()
    {
        // Arrange
        var user = new User
        {
            Id       = Guid.NewGuid(),
            Email    = "user@test.com",
            FullName = "Test User",
            Role     = AuthService.Core.Enums.UserRole.User,
            IsActive = true
        };

        var refreshToken = new RefreshToken
        {
            Token     = "valid-refresh-token",
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            IsRevoked = false,
            UserId    = user.Id,
            User      = user
        };

        _userRepo.Setup(r => r.GetRefreshTokenAsync("valid-refresh-token")).ReturnsAsync(refreshToken);
        _userRepo.Setup(r => r.RevokeRefreshTokenAsync(It.IsAny<RefreshToken>(), It.IsAny<string>())).Returns(Task.CompletedTask);
        _userRepo.Setup(r => r.AddRefreshTokenAsync(It.IsAny<RefreshToken>())).Returns(Task.CompletedTask);
        _userRepo.Setup(r => r.SaveChangesAsync()).Returns(Task.CompletedTask);
        _tokenService.Setup(t => t.GenerateAccessToken(user)).Returns("new-access-token");
        _tokenService.Setup(t => t.GenerateRefreshToken()).Returns("new-refresh-token");
        _tokenService.Setup(t => t.GetRefreshTokenExpiry()).Returns(DateTime.UtcNow.AddDays(7));

        // Act
        var result = await _sut.RefreshTokenAsync("valid-refresh-token");

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Data!.AccessToken.Should().Be("new-access-token");
        result.Data.RefreshToken.Should().Be("new-refresh-token");
    }

    [Fact]
    public async Task RefreshToken_WithExpiredToken_ReturnsFailure()
    {
        // Arrange
        var expiredToken = new RefreshToken
        {
            Token     = "expired-token",
            ExpiresAt = DateTime.UtcNow.AddDays(-1), // expired
            IsRevoked = false
        };

        _userRepo.Setup(r => r.GetRefreshTokenAsync("expired-token")).ReturnsAsync(expiredToken);

        // Act
        var result = await _sut.RefreshTokenAsync("expired-token");

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Error.Should().Be("Invalid or expired refresh token.");
    }
}