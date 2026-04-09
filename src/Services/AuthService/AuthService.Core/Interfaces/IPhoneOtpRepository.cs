using AuthService.Core.Entities;

namespace AuthService.Core.Interfaces;

public interface IPhoneOtpRepository
{
    Task AddAsync(PhoneOtp otp);
    Task<PhoneOtp?> GetLatestActiveAsync(string phone);
    Task SaveChangesAsync();
}
