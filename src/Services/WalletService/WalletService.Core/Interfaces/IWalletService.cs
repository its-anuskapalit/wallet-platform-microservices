using Shared.Common;
using WalletService.Core.DTOs;

namespace WalletService.Core.Interfaces;

public interface IWalletService
{
    Task<Result<WalletDto>> GetWalletAsync(Guid userId);
    Task<Result<WalletDto>> TopUpAsync(Guid userId, TopUpDto dto);
    Task<Result<WalletDto>> DeductAsync(Guid userId, DeductDto dto);
    Task<Result<WalletDto>> FreezeAsync(Guid userId, FreezeDto dto);
    Task<Result<WalletDto>> UnfreezeAsync(Guid userId);
}