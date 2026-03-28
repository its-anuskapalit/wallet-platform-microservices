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

public class WalletDomainService : IWalletService
{
    private readonly IWalletRepository _wallets;
    private readonly IIdempotencyRepository _idempotency;
    private readonly IEventPublisher _publisher;

    public WalletDomainService(
        IWalletRepository wallets,
        IIdempotencyRepository idempotency,
        IEventPublisher publisher)
    {
        _wallets      = wallets;
        _idempotency  = idempotency;
        _publisher    = publisher;
    }

    public async Task<Result<WalletDto>> GetWalletAsync(Guid userId)
    {
        var wallet = await _wallets.GetByUserIdAsync(userId);
        if (wallet is null)
            return Result<WalletDto>.Failure("Wallet not found.");

        return Result<WalletDto>.Success(MapToDto(wallet));
    }

    public async Task<Result<WalletDto>> TopUpAsync(Guid userId, TopUpDto dto)
    {
        if (dto.Amount <= 0)
            return Result<WalletDto>.Failure("Amount must be greater than zero.");

        var cached = await _idempotency.GetAsync(dto.IdempotencyKey);
        if (cached is not null)
            return Result<WalletDto>.Success(
                JsonSerializer.Deserialize<WalletDto>(cached.Response)!);

        var wallet = await _wallets.GetByUserIdAsync(userId);
        if (wallet is null)
            return Result<WalletDto>.Failure("Wallet not found.");

        if (wallet.Status == WalletStatus.Frozen)
            return Result<WalletDto>.Failure("Wallet is frozen.");

        wallet.Balance   += dto.Amount;
        wallet.UpdatedAt  = DateTime.UtcNow;

        var response = MapToDto(wallet);

        await _idempotency.AddAsync(new IdempotencyKey
        {
            Key      = dto.IdempotencyKey,
            Response = JsonSerializer.Serialize(response)
        });

        await _wallets.SaveChangesAsync();
        return Result<WalletDto>.Success(response);
    }

    public async Task<Result<WalletDto>> DeductAsync(Guid userId, DeductDto dto)
    {
        if (dto.Amount <= 0)
            return Result<WalletDto>.Failure("Amount must be greater than zero.");

        var cached = await _idempotency.GetAsync(dto.IdempotencyKey);
        if (cached is not null)
            return Result<WalletDto>.Success(
                JsonSerializer.Deserialize<WalletDto>(cached.Response)!);

        var wallet = await _wallets.GetByUserIdAsync(userId);
        if (wallet is null)
            return Result<WalletDto>.Failure("Wallet not found.");

        if (wallet.Status == WalletStatus.Frozen)
            return Result<WalletDto>.Failure("Wallet is frozen.");

        if (wallet.Balance < dto.Amount)
            return Result<WalletDto>.Failure("Insufficient balance.");

        wallet.Balance   -= dto.Amount;
        wallet.UpdatedAt  = DateTime.UtcNow;

        var response = MapToDto(wallet);

        await _idempotency.AddAsync(new IdempotencyKey
        {
            Key      = dto.IdempotencyKey,
            Response = JsonSerializer.Serialize(response)
        });

        await _wallets.SaveChangesAsync();
        return Result<WalletDto>.Success(response);
    }

    public async Task<Result<WalletDto>> FreezeAsync(Guid userId, FreezeDto dto)
    {
        var wallet = await _wallets.GetByUserIdAsync(userId);
        if (wallet is null)
            return Result<WalletDto>.Failure("Wallet not found.");

        if (wallet.Status == WalletStatus.Frozen)
            return Result<WalletDto>.Failure("Wallet is already frozen.");

        wallet.Status      = WalletStatus.Frozen;
        wallet.FreezeReason = dto.Reason;
        wallet.UpdatedAt   = DateTime.UtcNow;

        await _wallets.SaveChangesAsync();

        await _publisher.PublishAsync(
            new WalletFrozenEvent
            {
                WalletId = wallet.Id,
                UserId   = wallet.UserId,
                Email    = wallet.Email,
                Reason   = dto.Reason,
                FrozenAt = DateTime.UtcNow
            },
            EventQueues.WalletExchange,
            routingKey: "wallet.frozen");

        return Result<WalletDto>.Success(MapToDto(wallet));
    }

    public async Task<Result<WalletDto>> UnfreezeAsync(Guid userId)
    {
        var wallet = await _wallets.GetByUserIdAsync(userId);
        if (wallet is null)
            return Result<WalletDto>.Failure("Wallet not found.");

        if (wallet.Status != WalletStatus.Frozen)
            return Result<WalletDto>.Failure("Wallet is not frozen.");

        wallet.Status       = WalletStatus.Active;
        wallet.FreezeReason = null;
        wallet.UpdatedAt    = DateTime.UtcNow;

        await _wallets.SaveChangesAsync();
        return Result<WalletDto>.Success(MapToDto(wallet));
    }

    private static WalletDto MapToDto(Wallet w) => new()
    {
        Id       = w.Id,
        UserId   = w.UserId,
        Email    = w.Email,
        FullName = w.FullName,
        Balance  = w.Balance,
        Currency = w.Currency,
        Status   = w.Status
    };
}