using System.Text.Json;
using Shared.Common;
using Shared.Contracts;
using Shared.Contracts.Events;
using Shared.EventBus;
using WalletService.Core.DTOs;
using WalletService.Core.Entities;
using WalletService.Core.Enums;
using WalletService.Core.Interfaces;

namespace WalletService.Core.Services;

/// <summary>
/// Implements wallet business logic including balance enquiry, top-up, deduction,
/// and freeze/unfreeze operations. Uses idempotency keys to make mutating operations safe to retry.
/// Publishes a <c>WalletFrozenEvent</c> when a wallet is frozen.
/// </summary>
public class WalletDomainService : IWalletService
{
    private readonly IWalletRepository _wallets;
    private readonly IIdempotencyRepository _idempotency;
    private readonly IEventPublisher _publisher;

    /// <summary>
    /// Initializes a new instance of <see cref="WalletDomainService"/>.
    /// </summary>
    /// <param name="wallets">Repository for wallet persistence.</param>
    /// <param name="idempotency">Repository for idempotency-key tracking.</param>
    /// <param name="publisher">Event publisher for broadcasting domain events.</param>
    public WalletDomainService(IWalletRepository wallets, IIdempotencyRepository idempotency, IEventPublisher publisher)
    {
        _wallets = wallets;
        _idempotency = idempotency;
        _publisher = publisher;
    }
    /// <summary>
    /// Retrieves the wallet belonging to the specified user.
    /// If no wallet exists (e.g. the UserRegisteredEvent was missed), one is created automatically
    /// with a zero balance so the user is never blocked.
    /// </summary>
    public async Task<Result<WalletDto>> GetWalletAsync(Guid userId)
    {
        var wallet = await _wallets.GetByUserIdAsync(userId);
        if (wallet is null)
            wallet = await CreateWalletAsync(userId);

        return Result<WalletDto>.Success(MapToDto(wallet));
    }

    /// <summary>
    /// Adds funds to the user's wallet. Returns a cached response if the idempotency key was seen before.
    /// </summary>
    /// <param name="userId">The user whose wallet will be credited.</param>
    /// <param name="dto">Top-up payload including amount and idempotency key.</param>
    /// <returns>
    /// A successful result with the updated wallet; or a failure if the amount is invalid,
    /// the wallet is not found, or the wallet is frozen.
    /// </returns>
    public async Task<Result<WalletDto>> TopUpAsync(Guid userId, TopUpDto dto)
    {
        if (dto.Amount <= 0)
        {
            return Result<WalletDto>.Failure("Amount must be greater than zero.");
        }
        var cached = await _idempotency.GetAsync(dto.IdempotencyKey);
        if (cached is not null)
        {
            return Result<WalletDto>.Success(JsonSerializer.Deserialize<WalletDto>(cached.Response)!);
        }
        var wallet = await _wallets.GetByUserIdAsync(userId)
                     ?? await CreateWalletAsync(userId);

        if (wallet.Status == WalletStatus.Frozen)
        {
            return Result<WalletDto>.Failure("Wallet is frozen.");
        }
        wallet.Balance += dto.Amount;
        wallet.UpdatedAt = DateTime.UtcNow;

        var response = MapToDto(wallet);

        await _idempotency.AddAsync(new IdempotencyKey
        {
            Key = dto.IdempotencyKey,
            Response = JsonSerializer.Serialize(response)
        });

        await _wallets.SaveChangesAsync();
        return Result<WalletDto>.Success(response);
    }

    /// <summary>
    /// Deducts funds from the user's wallet. Returns a cached response if the idempotency key was seen before.
    /// </summary>
    /// <param name="userId">The user whose wallet will be debited.</param>
    /// <param name="dto">Deduction payload including amount and idempotency key.</param>
    /// <returns>
    /// A successful result with the updated wallet; or a failure if the amount is invalid,
    /// the wallet is not found, the wallet is frozen, or there is insufficient balance.
    /// </returns>
    public async Task<Result<WalletDto>> DeductAsync(Guid userId, DeductDto dto)
    {
        if (dto.Amount <= 0)
        {
            return Result<WalletDto>.Failure("Amount must be greater than zero.");
        }
        var cached = await _idempotency.GetAsync(dto.IdempotencyKey);
        if (cached is not null)
        {
            return Result<WalletDto>.Success(JsonSerializer.Deserialize<WalletDto>(cached.Response)!);
        }
        var wallet = await _wallets.GetByUserIdAsync(userId);
        if (wallet is null)
        {
            return Result<WalletDto>.Failure("Wallet not found.");
        }
        if (wallet.Status == WalletStatus.Frozen)
        {
            return Result<WalletDto>.Failure("Wallet is frozen.");
        }
        if (wallet.Balance < dto.Amount)
        {
            return Result<WalletDto>.Failure("Insufficient balance.");
        }
        wallet.Balance -= dto.Amount;
        wallet.UpdatedAt = DateTime.UtcNow;

        var response = MapToDto(wallet);

        await _idempotency.AddAsync(new IdempotencyKey
        {
            Key = dto.IdempotencyKey,
            Response = JsonSerializer.Serialize(response)
        });

        await _wallets.SaveChangesAsync();
        return Result<WalletDto>.Success(response);
    }

    /// <summary>
    /// Freezes the user's wallet, preventing any further debit or credit operations,
    /// and publishes a <c>WalletFrozenEvent</c> to notify downstream services.
    /// </summary>
    /// <param name="userId">The user whose wallet will be frozen.</param>
    /// <param name="dto">Freeze payload containing the reason for freezing.</param>
    /// <returns>A successful result with the updated wallet; or a failure if already frozen or not found.</returns>
    public async Task<Result<WalletDto>> FreezeAsync(Guid userId, FreezeDto dto)
    {
        var wallet = await _wallets.GetByUserIdAsync(userId);
        if (wallet is null)
        {
            return Result<WalletDto>.Failure("Wallet not found.");
        }
        if (wallet.Status == WalletStatus.Frozen)
        {
            return Result<WalletDto>.Failure("Wallet is already frozen.");
        }
        wallet.Status = WalletStatus.Frozen;
        wallet.FreezeReason = dto.Reason;
        wallet.UpdatedAt = DateTime.UtcNow;

        await _wallets.SaveChangesAsync();
        await _publisher.PublishAsync(
            new WalletFrozenEvent
            {
                WalletId = wallet.Id,
                UserId = wallet.UserId,
                Email = wallet.Email,
                Reason = dto.Reason,
                FrozenAt = DateTime.UtcNow
            },
            EventQueues.WalletExchange,
            routingKey: "wallet.frozen");

        return Result<WalletDto>.Success(MapToDto(wallet));
    }

    /// <summary>Restores a frozen wallet to active status and clears the freeze reason.</summary>
    /// <param name="userId">The user whose wallet will be unfrozen.</param>
    /// <returns>A successful result with the updated wallet; or a failure if not frozen or not found.</returns>
    public async Task<Result<WalletDto>> UnfreezeAsync(Guid userId)
    {
        var wallet = await _wallets.GetByUserIdAsync(userId);
        if (wallet is null)
        {
            return Result<WalletDto>.Failure("Wallet not found.");
        }
        if (wallet.Status != WalletStatus.Frozen)
        {
            return Result<WalletDto>.Failure("Wallet is not frozen.");
        }
        wallet.Status = WalletStatus.Active;
        wallet.FreezeReason = null;
        wallet.UpdatedAt = DateTime.UtcNow;

        await _wallets.SaveChangesAsync();
        return Result<WalletDto>.Success(MapToDto(wallet));
    }

    /// <summary>
    /// Credits a wallet as the receiver side of a completed transfer.
    /// Uses the transaction ID as idempotency key so re-delivery is safe.
    /// </summary>
    public async Task<Result<WalletDto>> CreditAsync(Guid userId, string idempotencyKey, decimal amount, string currency)
    {
        var cached = await _idempotency.GetAsync($"credit:{idempotencyKey}");
        if (cached is not null)
            return Result<WalletDto>.Success(JsonSerializer.Deserialize<WalletDto>(cached.Response)!);

        var wallet = await _wallets.GetByUserIdAsync(userId);
        if (wallet is null)
            return Result<WalletDto>.Failure("Receiver wallet not found.");

        wallet.Balance    += amount;
        wallet.UpdatedAt   = DateTime.UtcNow;

        var response = MapToDto(wallet);
        await _idempotency.AddAsync(new IdempotencyKey { Key = $"credit:{idempotencyKey}", Response = JsonSerializer.Serialize(response) });
        await _wallets.SaveChangesAsync();
        return Result<WalletDto>.Success(response);
    }

    /// <summary>
    /// Debits funds from a wallet as the sender side of a completed transfer.
    /// Uses the transaction ID as idempotency key so re-delivery is safe.
    /// Fails silently (logs) if balance is insufficient — the ledger already recorded the transfer.
    /// </summary>
    public async Task<Result<WalletDto>> DebitTransferAsync(Guid userId, string idempotencyKey, decimal amount, string currency)
    {
        var cached = await _idempotency.GetAsync($"debit:{idempotencyKey}");
        if (cached is not null)
            return Result<WalletDto>.Success(JsonSerializer.Deserialize<WalletDto>(cached.Response)!);

        var wallet = await _wallets.GetByUserIdAsync(userId);
        if (wallet is null)
            return Result<WalletDto>.Failure("Sender wallet not found.");

        if (wallet.Balance < amount)
            return Result<WalletDto>.Failure("Insufficient balance.");

        wallet.Balance   -= amount;
        wallet.UpdatedAt  = DateTime.UtcNow;

        var response = MapToDto(wallet);
        await _idempotency.AddAsync(new IdempotencyKey { Key = $"debit:{idempotencyKey}", Response = JsonSerializer.Serialize(response) });
        await _wallets.SaveChangesAsync();
        return Result<WalletDto>.Success(response);
    }

    /// <summary>Maps a <see cref="Wallet"/> entity to a <see cref="WalletDto"/> for API responses.</summary>
    /// <summary>
    /// Self-healing: creates a zero-balance wallet for a user whose UserRegisteredEvent was missed
    /// (e.g. RabbitMQ was unavailable at registration time).
    /// </summary>
    private async Task<Wallet> CreateWalletAsync(Guid userId)
    {
        var wallet = new Wallet
        {
            UserId   = userId,
            Currency = "INR",
            Balance  = 0,
            Status   = WalletStatus.Active
        };
        await _wallets.AddAsync(wallet);
        await _wallets.SaveChangesAsync();
        return wallet;
    }

    private static WalletDto MapToDto(Wallet w) => new()
    {
        Id = w.Id,
        UserId = w.UserId,
        Email = w.Email,
        FullName = w.FullName,
        Balance = w.Balance,
        Currency = w.Currency,
        Status = w.Status
    };
}