using Microsoft.EntityFrameworkCore;
using WalletService.Core.Entities;
using WalletService.Core.Interfaces;
using WalletService.Infrastructure.Data;

namespace WalletService.Infrastructure.Repositories;

public class WalletRepository : IWalletRepository
{
    private readonly WalletDbContext _db;

    public WalletRepository(WalletDbContext db)
    {
        _db = db;
    }

    public async Task<Wallet?> GetByUserIdAsync(Guid userId) =>
        await _db.Wallets.FirstOrDefaultAsync(w => w.UserId == userId);

    public async Task<Wallet?> GetByIdAsync(Guid walletId) =>
        await _db.Wallets.FirstOrDefaultAsync(w => w.Id == walletId);

    public async Task<bool> ExistsByUserIdAsync(Guid userId) =>
        await _db.Wallets.AnyAsync(w => w.UserId == userId);

    public async Task AddAsync(Wallet wallet) =>
        await _db.Wallets.AddAsync(wallet);

    public async Task SaveChangesAsync() =>
        await _db.SaveChangesAsync();
}