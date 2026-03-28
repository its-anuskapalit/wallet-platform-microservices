using Microsoft.EntityFrameworkCore;
using ReceiptsService.Core.Entities;
using ReceiptsService.Core.Interfaces;
using ReceiptsService.Infrastructure.Data;

namespace ReceiptsService.Infrastructure.Repositories;

public class ReceiptRepository : IReceiptRepository
{
    private readonly ReceiptsDbContext _db;

    public ReceiptRepository(ReceiptsDbContext db)
    {
        _db = db;
    }

    public async Task<Receipt?> GetByTransactionIdAsync(Guid transactionId) =>
        await _db.Receipts.FirstOrDefaultAsync(r => r.TransactionId == transactionId);

    public async Task<IEnumerable<Receipt>> GetByUserIdAsync(Guid userId) =>
        await _db.Receipts
            .Where(r => r.SenderUserId == userId || r.ReceiverUserId == userId)
            .OrderByDescending(r => r.TransactionDate)
            .ToListAsync();

    public async Task<bool> ExistsByTransactionIdAsync(Guid transactionId) =>
        await _db.Receipts.AnyAsync(r => r.TransactionId == transactionId);

    public async Task AddAsync(Receipt receipt) =>
        await _db.Receipts.AddAsync(receipt);

    public async Task SaveChangesAsync() =>
        await _db.SaveChangesAsync();
}