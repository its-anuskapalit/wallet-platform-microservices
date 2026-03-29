using FluentAssertions;
using LedgerService.Core.DTOs;
using LedgerService.Core.Entities;
using LedgerService.Core.Interfaces;
using LedgerService.Core.Services;
using Moq;
using Shared.Contracts.Events;
using Shared.EventBus;

namespace LedgerService.Tests;

public class TransactionServiceTests
{
    private readonly Mock<ITransactionRepository>  _txnRepo;
    private readonly Mock<ILedgerEntryRepository>  _ledgerRepo;
    private readonly Mock<IEventPublisher>         _publisher;
    private readonly TransactionService            _sut;

    public TransactionServiceTests()
    {
        _txnRepo    = new Mock<ITransactionRepository>();
        _ledgerRepo = new Mock<ILedgerEntryRepository>();
        _publisher  = new Mock<IEventPublisher>();
        _sut        = new TransactionService(_txnRepo.Object, _ledgerRepo.Object, _publisher.Object);
    }

    private static InitiateTransactionDto ValidDto(string key = "key-001") => new()
    {
        SenderWalletId   = Guid.NewGuid(),
        ReceiverWalletId = Guid.NewGuid(),
        SenderUserId     = Guid.NewGuid(),
        ReceiverUserId   = Guid.NewGuid(),
        Amount           = 500m,
        Currency         = "INR",
        Type             = "Transfer",
        IdempotencyKey   = key
    };

    // ── Initiate Transaction ──────────────────────────────────────

    [Fact]
    public async Task Initiate_WithValidDto_ReturnsCompletedTransaction()
    {
        var dto = ValidDto();

        _txnRepo.Setup(r => r.GetByIdempotencyKeyAsync(dto.IdempotencyKey)).ReturnsAsync((Transaction?)null);
        _txnRepo.Setup(r => r.AddAsync(It.IsAny<Transaction>())).Returns(Task.CompletedTask);
        _ledgerRepo.Setup(r => r.AddRangeAsync(It.IsAny<IEnumerable<LedgerEntry>>())).Returns(Task.CompletedTask);
        _txnRepo.Setup(r => r.SaveChangesAsync()).Returns(Task.CompletedTask);
        _publisher.Setup(p => p.PublishAsync(
            It.IsAny<TransactionCompletedEvent>(),
            It.IsAny<string>(),
            It.IsAny<string>())).Returns(Task.CompletedTask);

        var result = await _sut.InitiateAsync(dto);

        result.IsSuccess.Should().BeTrue();
        result.Data!.Status.Should().Be("Completed");
        result.Data.Amount.Should().Be(500m);
    }

    [Fact]
    public async Task Initiate_WithZeroAmount_ReturnsFailure()
    {
        var dto = ValidDto();
        dto.Amount = 0;

        var result = await _sut.InitiateAsync(dto);

        result.IsSuccess.Should().BeFalse();
        result.Error.Should().Be("Amount must be greater than zero.");
    }

    [Fact]
    public async Task Initiate_WithNegativeAmount_ReturnsFailure()
    {
        var dto = ValidDto();
        dto.Amount = -100m;

        var result = await _sut.InitiateAsync(dto);

        result.IsSuccess.Should().BeFalse();
        result.Error.Should().Be("Amount must be greater than zero.");
    }

    [Fact]
    public async Task Initiate_WithSameSenderAndReceiver_ReturnsFailure()
    {
        var dto = ValidDto();
        dto.ReceiverWalletId = dto.SenderWalletId; // same wallet

        var result = await _sut.InitiateAsync(dto);

        result.IsSuccess.Should().BeFalse();
        result.Error.Should().Be("Sender and receiver cannot be the same.");
    }

    [Fact]
    public async Task Initiate_WithInvalidType_ReturnsFailure()
    {
        var dto = ValidDto();
        dto.Type = "InvalidType";

        _txnRepo.Setup(r => r.GetByIdempotencyKeyAsync(dto.IdempotencyKey)).ReturnsAsync((Transaction?)null);

        var result = await _sut.InitiateAsync(dto);

        result.IsSuccess.Should().BeFalse();
        result.Error.Should().Be("Invalid transaction type.");
    }

    [Fact]
    public async Task Initiate_WithDuplicateIdempotencyKey_ReturnsCachedTransaction()
    {
        var dto = ValidDto("duplicate-key");

        var existing = new Transaction
        {
            Id             = Guid.NewGuid(),
            Amount         = dto.Amount,
            Currency       = dto.Currency,
            IdempotencyKey = dto.IdempotencyKey,
            Status         = LedgerService.Core.Enums.TransactionStatus.Completed,
            Type           = LedgerService.Core.Enums.TransactionType.Transfer
        };

        _txnRepo.Setup(r => r.GetByIdempotencyKeyAsync(dto.IdempotencyKey)).ReturnsAsync(existing);

        var result = await _sut.InitiateAsync(dto);

        result.IsSuccess.Should().BeTrue();
        result.Data!.Id.Should().Be(existing.Id);
        // SaveChanges should NOT be called — cached response
        _txnRepo.Verify(r => r.SaveChangesAsync(), Times.Never);
    }

    [Fact]
    public async Task Initiate_WithValidDto_CreatesTwoLedgerEntries()
    {
        var dto = ValidDto();

        _txnRepo.Setup(r => r.GetByIdempotencyKeyAsync(dto.IdempotencyKey)).ReturnsAsync((Transaction?)null);
        _txnRepo.Setup(r => r.AddAsync(It.IsAny<Transaction>())).Returns(Task.CompletedTask);
        _txnRepo.Setup(r => r.SaveChangesAsync()).Returns(Task.CompletedTask);
        _publisher.Setup(p => p.PublishAsync(
            It.IsAny<TransactionCompletedEvent>(),
            It.IsAny<string>(),
            It.IsAny<string>())).Returns(Task.CompletedTask);

        IEnumerable<LedgerEntry>? capturedEntries = null;
        _ledgerRepo.Setup(r => r.AddRangeAsync(It.IsAny<IEnumerable<LedgerEntry>>()))
            .Callback<IEnumerable<LedgerEntry>>(entries => capturedEntries = entries)
            .Returns(Task.CompletedTask);

        await _sut.InitiateAsync(dto);

        // Verify exactly 2 ledger entries (double-entry accounting)
        capturedEntries.Should().HaveCount(2);
        capturedEntries.Should().Contain(e => e.EntryType == LedgerService.Core.Enums.EntryType.Debit);
        capturedEntries.Should().Contain(e => e.EntryType == LedgerService.Core.Enums.EntryType.Credit);
    }

    [Fact]
    public async Task Initiate_WithValidDto_PublishesTransactionCompletedEvent()
    {
        var dto = ValidDto();

        _txnRepo.Setup(r => r.GetByIdempotencyKeyAsync(dto.IdempotencyKey)).ReturnsAsync((Transaction?)null);
        _txnRepo.Setup(r => r.AddAsync(It.IsAny<Transaction>())).Returns(Task.CompletedTask);
        _ledgerRepo.Setup(r => r.AddRangeAsync(It.IsAny<IEnumerable<LedgerEntry>>())).Returns(Task.CompletedTask);
        _txnRepo.Setup(r => r.SaveChangesAsync()).Returns(Task.CompletedTask);
        _publisher.Setup(p => p.PublishAsync(
            It.IsAny<TransactionCompletedEvent>(),
            It.IsAny<string>(),
            It.IsAny<string>())).Returns(Task.CompletedTask);

        await _sut.InitiateAsync(dto);

        _publisher.Verify(p => p.PublishAsync(
            It.IsAny<TransactionCompletedEvent>(),
            It.IsAny<string>(),
            It.IsAny<string>()), Times.Once);
    }

    // ── Get Transaction ───────────────────────────────────────────

    [Fact]
    public async Task GetById_WithExistingId_ReturnsTransaction()
    {
        var txn = new Transaction
        {
            Id             = Guid.NewGuid(),
            Amount         = 500m,
            Currency       = "INR",
            IdempotencyKey = "key-001",
            Status         = LedgerService.Core.Enums.TransactionStatus.Completed,
            Type           = LedgerService.Core.Enums.TransactionType.Transfer
        };

        _txnRepo.Setup(r => r.GetByIdAsync(txn.Id)).ReturnsAsync(txn);

        var result = await _sut.GetByIdAsync(txn.Id);

        result.IsSuccess.Should().BeTrue();
        result.Data!.Id.Should().Be(txn.Id);
        result.Data.Amount.Should().Be(500m);
    }

    [Fact]
    public async Task GetById_WithNonExistentId_ReturnsFailure()
    {
        _txnRepo.Setup(r => r.GetByIdAsync(It.IsAny<Guid>())).ReturnsAsync((Transaction?)null);

        var result = await _sut.GetByIdAsync(Guid.NewGuid());

        result.IsSuccess.Should().BeFalse();
        result.Error.Should().Be("Transaction not found.");
    }
}