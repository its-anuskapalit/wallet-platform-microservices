using Microsoft.EntityFrameworkCore;
using WalletService.Core.Entities;
using WalletService.Core.Interfaces;
using WalletService.Infrastructure.Data;

namespace WalletService.Infrastructure.Repositories;

public class BillSplitRepository : IBillSplitRepository
{
    private readonly WalletDbContext _db;
    public BillSplitRepository(WalletDbContext db) => _db = db;

    public async Task<BillSplit> AddAsync(BillSplit split)
    {
        _db.BillSplits.Add(split);
        await _db.SaveChangesAsync();
        return split;
    }

    public Task<BillSplit?> GetByIdAsync(Guid id) =>
        _db.BillSplits.Include(s => s.Participants)
                      .FirstOrDefaultAsync(s => s.Id == id);

    public Task<List<BillSplit>> GetByCreatorAsync(Guid creatorUserId) =>
        _db.BillSplits.Include(s => s.Participants)
                      .Where(s => s.CreatorUserId == creatorUserId)
                      .OrderByDescending(s => s.CreatedAt)
                      .ToListAsync();

    public Task<List<BillSplit>> GetByParticipantEmailAsync(string email) =>
        _db.BillSplits.Include(s => s.Participants)
                      .Where(s => s.Participants.Any(p => p.Email.ToLower() == email.ToLower()))
                      .OrderByDescending(s => s.CreatedAt)
                      .ToListAsync();

    public Task SaveChangesAsync() => _db.SaveChangesAsync();
}
