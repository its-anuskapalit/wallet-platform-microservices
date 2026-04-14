using FluentAssertions;
using Moq;
using Shared.Contracts.Events;
using Shared.EventBus;
using WalletService.Core.DTOs;
using WalletService.Core.Entities;
using WalletService.Core.Enums;
using WalletService.Core.Interfaces;
using WalletService.Core.Services;

namespace WalletService.Tests;

public class WalletServiceTests
{
    private readonly Mock<IWalletRepository>      _walletRepo;
    private readonly Mock<IIdempotencyRepository> _idempotencyRepo;
    private readonly Mock<IEventPublisher>        _publisher;
    private readonly WalletDomainService          _sut;

    public WalletServiceTests()
    {
        _walletRepo      = new Mock<IWalletRepository>();
        _idempotencyRepo = new Mock<IIdempotencyRepository>();
        _publisher       = new Mock<IEventPublisher>();
        _sut             = new WalletDomainService(_walletRepo.Object, _idempotencyRepo.Object, _publisher.Object);
    }

    private static Wallet ActiveWallet(decimal balance = 1000m) => new()
    {
        Id       = Guid.NewGuid(),
        UserId   = Guid.NewGuid(),
        Email    = "test@test.com",
        FullName = "Test User",
        Balance  = balance,
        Currency = "INR",
        Status   = WalletStatus.Active
    };

    // ── Get Wallet ────────────────────────────────────────────────

    [Fact]
    public async Task GetWallet_WithExistingWallet_ReturnsSuccess()
    {
        var wallet = ActiveWallet();
        _walletRepo.Setup(r => r.GetByUserIdAsync(wallet.UserId)).ReturnsAsync(wallet);

        var result = await _sut.GetWalletAsync(wallet.UserId);

        result.IsSuccess.Should().BeTrue();
        result.Data!.Balance.Should().Be(1000m);
    }

    [Fact]
    public async Task GetWallet_WithNonExistentWallet_CreatesWalletAndReturnsSuccess()
    {
        var userId = Guid.NewGuid();
        _walletRepo.Setup(r => r.GetByUserIdAsync(userId)).ReturnsAsync((Wallet?)null);
        _walletRepo.Setup(r => r.AddAsync(It.IsAny<Wallet>())).Returns(Task.CompletedTask);
        _walletRepo.Setup(r => r.SaveChangesAsync()).Returns(Task.CompletedTask);

        var result = await _sut.GetWalletAsync(userId);

        result.IsSuccess.Should().BeTrue();
        result.Data!.UserId.Should().Be(userId);
        result.Data.Balance.Should().Be(0m);
        _walletRepo.Verify(r => r.AddAsync(It.Is<Wallet>(w => w.UserId == userId)), Times.Once);
    }

    // ── Top Up ────────────────────────────────────────────────────

    [Fact]
    public async Task TopUp_WithValidAmount_IncreasesBalance()
    {
        var wallet = ActiveWallet(1000m);
        var dto    = new TopUpDto { Amount = 500m, IdempotencyKey = "key-001" };

        _idempotencyRepo.Setup(r => r.GetAsync(dto.IdempotencyKey)).ReturnsAsync((IdempotencyKey?)null);
        _walletRepo.Setup(r => r.GetByUserIdAsync(wallet.UserId)).ReturnsAsync(wallet);
        _idempotencyRepo.Setup(r => r.AddAsync(It.IsAny<IdempotencyKey>())).Returns(Task.CompletedTask);
        _walletRepo.Setup(r => r.SaveChangesAsync()).Returns(Task.CompletedTask);

        var result = await _sut.TopUpAsync(wallet.UserId, dto);

        result.IsSuccess.Should().BeTrue();
        result.Data!.Balance.Should().Be(1500m);
    }

    [Fact]
    public async Task TopUp_WithZeroAmount_ReturnsFailure()
    {
        var dto = new TopUpDto { Amount = 0m, IdempotencyKey = "key-002" };

        var result = await _sut.TopUpAsync(Guid.NewGuid(), dto);

        result.IsSuccess.Should().BeFalse();
        result.Error.Should().Be("Amount must be greater than zero.");
    }

    [Fact]
    public async Task TopUp_WithFrozenWallet_ReturnsFailure()
    {
        var wallet = ActiveWallet();
        wallet.Status = WalletStatus.Frozen;
        var dto = new TopUpDto { Amount = 500m, IdempotencyKey = "key-003" };

        _idempotencyRepo.Setup(r => r.GetAsync(dto.IdempotencyKey)).ReturnsAsync((IdempotencyKey?)null);
        _walletRepo.Setup(r => r.GetByUserIdAsync(wallet.UserId)).ReturnsAsync(wallet);

        var result = await _sut.TopUpAsync(wallet.UserId, dto);

        result.IsSuccess.Should().BeFalse();
        result.Error.Should().Be("Wallet is frozen.");
    }

    [Fact]
    public async Task TopUp_WithDuplicateIdempotencyKey_ReturnsCachedResponse()
    {
        var dto = new TopUpDto { Amount = 500m, IdempotencyKey = "duplicate-key" };

        var cached = new IdempotencyKey
        {
            Key      = dto.IdempotencyKey,
            Response = """{"id":"test","userId":"00000000-0000-0000-0000-000000000000","email":"","fullName":"","balance":1500.0,"currency":"INR","status":1}"""
        };

        _idempotencyRepo.Setup(r => r.GetAsync(dto.IdempotencyKey)).ReturnsAsync(cached);

        var result = await _sut.TopUpAsync(Guid.NewGuid(), dto);

        result.IsSuccess.Should().BeTrue();
        // Repository AddAsync should NOT be called — cached response returned
        _walletRepo.Verify(r => r.SaveChangesAsync(), Times.Never);
    }

    // ── Deduct ────────────────────────────────────────────────────

    [Fact]
    public async Task Deduct_WithSufficientBalance_DecreasesBalance()
    {
        var wallet = ActiveWallet(1000m);
        var dto    = new DeductDto { Amount = 300m, IdempotencyKey = "deduct-001" };

        _idempotencyRepo.Setup(r => r.GetAsync(dto.IdempotencyKey)).ReturnsAsync((IdempotencyKey?)null);
        _walletRepo.Setup(r => r.GetByUserIdAsync(wallet.UserId)).ReturnsAsync(wallet);
        _idempotencyRepo.Setup(r => r.AddAsync(It.IsAny<IdempotencyKey>())).Returns(Task.CompletedTask);
        _walletRepo.Setup(r => r.SaveChangesAsync()).Returns(Task.CompletedTask);

        var result = await _sut.DeductAsync(wallet.UserId, dto);

        result.IsSuccess.Should().BeTrue();
        result.Data!.Balance.Should().Be(700m);
    }

    [Fact]
    public async Task Deduct_WithInsufficientBalance_ReturnsFailure()
    {
        var wallet = ActiveWallet(100m);
        var dto    = new DeductDto { Amount = 500m, IdempotencyKey = "deduct-002" };

        _idempotencyRepo.Setup(r => r.GetAsync(dto.IdempotencyKey)).ReturnsAsync((IdempotencyKey?)null);
        _walletRepo.Setup(r => r.GetByUserIdAsync(wallet.UserId)).ReturnsAsync(wallet);

        var result = await _sut.DeductAsync(wallet.UserId, dto);

        result.IsSuccess.Should().BeFalse();
        result.Error.Should().Be("Insufficient balance.");
    }

    [Fact]
    public async Task Deduct_WithNegativeAmount_ReturnsFailure()
    {
        var dto = new DeductDto { Amount = -100m, IdempotencyKey = "deduct-003" };

        var result = await _sut.DeductAsync(Guid.NewGuid(), dto);

        result.IsSuccess.Should().BeFalse();
        result.Error.Should().Be("Amount must be greater than zero.");
    }

    // ── Freeze / Unfreeze ─────────────────────────────────────────

    [Fact]
    public async Task Freeze_WithActiveWallet_FreezesWallet()
    {
        var wallet = ActiveWallet();
        var dto    = new FreezeDto { Reason = "Suspicious activity" };

        _walletRepo.Setup(r => r.GetByUserIdAsync(wallet.UserId)).ReturnsAsync(wallet);
        _walletRepo.Setup(r => r.SaveChangesAsync()).Returns(Task.CompletedTask);
        _publisher.Setup(p => p.PublishAsync(
            It.IsAny<WalletFrozenEvent>(),
            It.IsAny<string>(),
            It.IsAny<string>())).Returns(Task.CompletedTask);

        var result = await _sut.FreezeAsync(wallet.UserId, dto);

        result.IsSuccess.Should().BeTrue();
        result.Data!.Status.Should().Be(WalletStatus.Frozen);
    }

    [Fact]
    public async Task Freeze_WithAlreadyFrozenWallet_ReturnsFailure()
    {
        var wallet = ActiveWallet();
        wallet.Status = WalletStatus.Frozen;
        var dto = new FreezeDto { Reason = "Test" };

        _walletRepo.Setup(r => r.GetByUserIdAsync(wallet.UserId)).ReturnsAsync(wallet);

        var result = await _sut.FreezeAsync(wallet.UserId, dto);

        result.IsSuccess.Should().BeFalse();
        result.Error.Should().Be("Wallet is already frozen.");
    }

    [Fact]
    public async Task Unfreeze_WithFrozenWallet_UnfreezesWallet()
    {
        var wallet = ActiveWallet();
        wallet.Status = WalletStatus.Frozen;

        _walletRepo.Setup(r => r.GetByUserIdAsync(wallet.UserId)).ReturnsAsync(wallet);
        _walletRepo.Setup(r => r.SaveChangesAsync()).Returns(Task.CompletedTask);

        var result = await _sut.UnfreezeAsync(wallet.UserId);

        result.IsSuccess.Should().BeTrue();
        result.Data!.Status.Should().Be(WalletStatus.Active);
    }

    [Fact]
    public async Task Unfreeze_WithActiveWallet_ReturnsFailure()
    {
        var wallet = ActiveWallet();
        _walletRepo.Setup(r => r.GetByUserIdAsync(wallet.UserId)).ReturnsAsync(wallet);

        var result = await _sut.UnfreezeAsync(wallet.UserId);

        result.IsSuccess.Should().BeFalse();
        result.Error.Should().Be("Wallet is not frozen.");
    }
}