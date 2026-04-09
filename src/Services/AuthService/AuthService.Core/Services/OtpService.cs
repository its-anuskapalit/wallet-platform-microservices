using AuthService.Core.DTOs;
using AuthService.Core.Entities;
using AuthService.Core.Interfaces;
using Microsoft.Extensions.Logging;
using Shared.Common;

namespace AuthService.Core.Services;

/// <summary>
/// Handles phone OTP generation and delivery.
/// OTP is emailed to the user (requires Smtp config). Expiry is 2 minutes.
/// When SMTP is not configured the OTP is printed to console so development still works.
/// </summary>
public class OtpDomainService : IOtpService
{
    private readonly IPhoneOtpRepository _otpRepo;
    private readonly IEmailSender        _email;
    private readonly ILogger<OtpDomainService> _log;

    public OtpDomainService(
        IPhoneOtpRepository otpRepo,
        IEmailSender        email,
        ILogger<OtpDomainService> log)
    {
        _otpRepo = otpRepo;
        _email   = email;
        _log     = log;
    }

    public async Task<Result<SendOtpResponseDto>> SendOtpAsync(string phone, string recipientEmail, bool isDevelopment)
    {
        if (string.IsNullOrWhiteSpace(phone) || phone.Length < 10)
            return Result<SendOtpResponseDto>.Failure("Please provide a valid 10-digit phone number.");

        var code = GenerateCode();

        await _otpRepo.AddAsync(new PhoneOtp
        {
            Phone     = phone.Trim(),
            OtpCode   = code,
            ExpiresAt = DateTime.UtcNow.AddMinutes(2)   // 2-minute window
        });
        await _otpRepo.SaveChangesAsync();

        // Send email with OTP
        var sent = await _email.SendAsync(
            to:       recipientEmail,
            subject:  "Your WalletPlatform OTP",
            htmlBody: BuildOtpEmail(code, phone));

        if (!sent)
        {
            // Fallback: always log OTP to console so dev can still test
            _log.LogWarning(
                "=== OTP FALLBACK (email failed) — Phone: {Phone} | Code: {Code} | Expires in 2 min ===",
                phone, code);
        }

        return Result<SendOtpResponseDto>.Success(new SendOtpResponseDto
        {
            Message = sent
                ? $"OTP sent to {MaskEmail(recipientEmail)}. It expires in 2 minutes."
                : "OTP generated. Check server console (email not configured).",
            OtpCode = null   // never expose in API response
        });
    }

    public async Task<Result> VerifyOtpAsync(string phone, string otpCode)
    {
        var otp = await _otpRepo.GetLatestActiveAsync(phone.Trim());

        if (otp is null)
            return Result.Failure("No active OTP found. Please request a new one.");
        if (otp.ExpiresAt < DateTime.UtcNow)
            return Result.Failure("OTP has expired. Please request a new one.");
        if (otp.OtpCode != otpCode.Trim())
            return Result.Failure("Invalid OTP. Please try again.");

        otp.IsUsed = true;
        await _otpRepo.SaveChangesAsync();

        return Result.Success();
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private static string GenerateCode() =>
        Random.Shared.Next(100_000, 999_999).ToString();

    private static string MaskEmail(string email)
    {
        var at = email.IndexOf('@');
        if (at <= 1) return email;
        return email[0] + "***" + email[at..];
    }

    private static string BuildOtpEmail(string code, string phone) => $"""
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#fff;border-radius:12px;border:1px solid #e8e0d8;">
          <div style="text-align:center;margin-bottom:24px;">
            <div style="display:inline-block;background:#7B3F00;color:white;padding:10px 20px;border-radius:8px;font-size:20px;font-weight:800;letter-spacing:0.05em;">
              WalletPlatform
            </div>
          </div>
          <h2 style="color:#1a1a1a;margin:0 0 8px;">Your Verification Code</h2>
          <p style="color:#666;margin:0 0 24px;">
            Use this OTP to verify your phone number <strong>{phone}</strong> during registration.
          </p>
          <div style="background:#FFF8F0;border:2px dashed #7B3F00;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
            <span style="font-size:40px;font-weight:900;letter-spacing:0.25em;color:#7B3F00;">{code}</span>
          </div>
          <p style="color:#e53e3e;font-size:13px;text-align:center;margin:0 0 24px;">
            ⏱ This code expires in <strong>2 minutes</strong>. Do not share it with anyone.
          </p>
          <hr style="border:none;border-top:1px solid #e8e0d8;margin:0 0 16px;"/>
          <p style="color:#aaa;font-size:11px;text-align:center;margin:0;">
            If you didn't request this, please ignore this email.
          </p>
        </div>
        """;
}
