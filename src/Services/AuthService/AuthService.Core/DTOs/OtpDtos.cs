namespace AuthService.Core.DTOs;

public class SendOtpDto
{
    public string Phone { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
}

public class VerifyOtpDto
{
    public string Phone { get; set; } = string.Empty;
    public string OtpCode { get; set; } = string.Empty;
}

public class SendOtpResponseDto
{
    public string Message { get; set; } = string.Empty;
    /// <summary>
    /// Only populated in Development environment for testing purposes.
    /// Remove or hide behind a feature flag in production.
    /// </summary>
    public string? OtpCode { get; set; }
}
