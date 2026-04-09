namespace AuthService.Core.Entities;

public class PhoneOtp
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Phone { get; set; } = string.Empty;
    public string OtpCode { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public bool IsUsed { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
