using Microsoft.EntityFrameworkCore;
using ReceiptsService.Core.Entities;
using ReceiptsService.Core.Interfaces;
using ReceiptsService.Infrastructure.Data;

namespace ReceiptsService.Infrastructure.Repositories;

/// <summary>
/// Entity Framework Core implementation of <see cref="IReceiptRepository"/> for the Receipts service.
/// </summary>
public class ReceiptRepository : IReceiptRepository
{
    private readonly ReceiptsDbContext _db;

    /// <summary>
    /// Initializes a new instance of <see cref="ReceiptRepository"/>.
    /// </summary>
    /// <param name="db">The EF Core database context for the Receipts service.</param>
    public ReceiptRepository(ReceiptsDbContext db)
    {
        _db = db;
    }

    /// <summary>Retrieves the receipt associated with the specified transaction.</summary>
    /// <param name="transactionId">The transaction's unique identifier.</param>
    /// <returns>The matching <see cref="Receipt"/>, or <c>null</c> if not found.</returns>
    public async Task<Receipt?> GetByTransactionIdAsync(Guid transactionId) =>
        await _db.Receipts.FirstOrDefaultAsync(r => r.TransactionId == transactionId);

    /// <summary>
    /// Retrieves all receipts where the specified user is either the sender or receiver,
    /// ordered by transaction date descending.
    /// </summary>
    /// <param name="userId">The user's unique identifier.</param>
    /// <returns>An ordered list of receipts involving the user.</returns>
    public async Task<IEnumerable<Receipt>> GetByUserIdAsync(Guid userId) =>
        await _db.Receipts
            .Where(r => r.SenderUserId == userId || r.ReceiverUserId == userId)
            .OrderByDescending(r => r.TransactionDate)
            .ToListAsync();

    /// <summary>Checks whether a receipt already exists for the given transaction.</summary>
    /// <param name="transactionId">The transaction's unique identifier.</param>
    /// <returns><c>true</c> if a receipt exists; otherwise <c>false</c>.</returns>
    public async Task<bool> ExistsByTransactionIdAsync(Guid transactionId) =>
        await _db.Receipts.AnyAsync(r => r.TransactionId == transactionId);

    /// <summary>Stages a new <see cref="Receipt"/> entity for insertion.</summary>
    /// <param name="receipt">The receipt to add.</param>
    public async Task AddAsync(Receipt receipt) =>
        await _db.Receipts.AddAsync(receipt);

    /// <summary>Persists all pending changes to the database.</summary>
    public async Task SaveChangesAsync() =>
        await _db.SaveChangesAsync();
}