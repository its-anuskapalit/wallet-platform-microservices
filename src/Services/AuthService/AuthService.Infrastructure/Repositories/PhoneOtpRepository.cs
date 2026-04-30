using AuthService.Core.Entities;
using AuthService.Core.Interfaces;
using AuthService.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AuthService.Infrastructure.Repositories;

public class PhoneOtpRepository : IPhoneOtpRepository
{
    private readonly AuthDbContext _db;

    public PhoneOtpRepository(AuthDbContext db) => _db = db;

    //Adds a new OTP record to the database.
    public async Task AddAsync(PhoneOtp otp) => await _db.PhoneOtps.AddAsync(otp);

    //gets most recent and unused OTP
    public async Task<PhoneOtp?> GetLatestActiveAsync(string phone) =>
        await _db.PhoneOtps
            .Where(o => o.Phone == phone && !o.IsUsed)
            .OrderByDescending(o => o.CreatedAt)
            .FirstOrDefaultAsync();

    public async Task SaveChangesAsync() => await _db.SaveChangesAsync();
}
