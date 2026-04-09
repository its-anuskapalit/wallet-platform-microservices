using AuthService.Core.DTOs;
using Shared.Common;

namespace AuthService.Core.Interfaces;

public interface IOtpService
{
    /// <summary>Generates a 6-digit OTP, persists it (2-min expiry), and emails it to the user.</summary>
    Task<Result<SendOtpResponseDto>> SendOtpAsync(string phone, string recipientEmail, bool isDevelopment);

    /// <summary>Verifies the OTP code for the given phone number.</summary>
    Task<Result> VerifyOtpAsync(string phone, string otpCode);
}
