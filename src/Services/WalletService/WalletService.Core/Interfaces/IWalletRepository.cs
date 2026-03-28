using WalletService.Core.Entities;

namespace WalletService.Core.Interfaces;

public interface IWalletRepository
{
    Task<Wallet?> GetByUserIdAsync(Guid userId);
    Task<Wallet?> GetByIdAsync(Guid walletId);
    Task<bool> ExistsByUserIdAsync(Guid userId);
    Task AddAsync(Wallet wallet);
    Task SaveChangesAsync();
}