namespace AdminService.Core.DTOs;

public class DashboardDto
{
    public int TotalUsers { get; set; }
    public int ActiveUsers { get; set; }
    public int PendingKyc { get; set; }
    public int ApprovedKyc { get; set; }
    public int TotalTransactions { get; set; }
    public decimal TotalTransactionAmount { get; set; }
    public int FraudFlags { get; set; }
    public int UnresolvedFraudFlags { get; set; }
}