using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using ReceiptsService.Core.DTOs;

namespace ReceiptsService.Core.Services;

/// <summary>
/// Generates a professionally formatted PDF receipt for a transaction using QuestPDF.
/// </summary>
public static class ReceiptPdfGenerator
{
    // Allow community/OSS use without a commercial licence warning
    static ReceiptPdfGenerator()
    {
        QuestPDF.Settings.License = LicenseType.Community;
    }

    public static byte[] Generate(ReceiptDto receipt)
    {
        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A5);
                page.Margin(32, Unit.Point);
                page.DefaultTextStyle(t => t.FontFamily("Arial").FontSize(10));

                page.Header().Element(ComposeHeader);
                page.Content().Element(c => ComposeContent(c, receipt));
                page.Footer().Element(ComposeFooter);
            });
        });

        return document.GeneratePdf();
    }

    private static void ComposeHeader(IContainer container)
    {
        container.Column(col =>
        {
            col.Item().Row(row =>
            {
                row.RelativeItem().Column(left =>
                {
                    left.Item().Text("WalletPlatform")
                        .FontSize(20).Bold().FontColor("#7B3F00");
                    left.Item().Text("Transaction Receipt")
                        .FontSize(11).FontColor("#666666");
                });
                row.ConstantItem(80).Height(40).Background("#7B3F00")
                    .AlignCenter().AlignMiddle()
                    .Text("RECEIPT").FontColor("#FFFFFF").Bold().FontSize(11);
            });

            col.Item().PaddingTop(8).LineHorizontal(1.5f).LineColor("#E0D8CF");
        });
    }

    private static void ComposeContent(IContainer container, ReceiptDto r)
    {
        container.PaddingTop(16).Column(col =>
        {
            // Status badge row
            col.Item().Row(row =>
            {
                row.RelativeItem().Text("TRANSACTION DETAILS")
                    .FontSize(9).Bold().FontColor("#999999").LetterSpacing(0.06f);
                row.ConstantItem(90)
                    .Background(r.TransactionType == "Transfer" ? "#E8F5E9" : "#E3F2FD")
                    .Padding(4)
                    .AlignCenter()
                    .Text(r.TransactionType.ToUpper())
                    .FontSize(9).Bold()
                    .FontColor(r.TransactionType == "Transfer" ? "#1B5E20" : "#0D47A1");
            });

            col.Item().PaddingTop(8).Table(table =>
            {
                table.ColumnsDefinition(cols =>
                {
                    cols.ConstantColumn(130);
                    cols.RelativeColumn();
                });

                void Row(string label, string value, bool highlight = false)
                {
                    var bg = highlight ? "#FFF8F0" : "#FFFFFF";

                    table.Cell().Background(bg).PaddingVertical(7).PaddingHorizontal(10)
                         .Text(label).FontColor("#777777").FontSize(9.5f);
                    table.Cell().Background(bg).PaddingVertical(7).PaddingHorizontal(10)
                         .Text(value).Bold().FontSize(9.5f);
                }

                Row("Receipt ID",         r.Id.ToString()[..8].ToUpper() + "...");
                Row("Transaction ID",     r.TransactionId.ToString()[..8].ToUpper() + "...");
                Row("Date & Time",        r.TransactionDate.ToString("dd MMM yyyy, hh:mm tt") + " UTC");
                Row("Transaction Type",   r.TransactionType);
                Row("Currency",           r.Currency);
                Row("Amount",             $"{r.Currency} {r.Amount:N2}", highlight: true);
            });

            // Amount box
            col.Item().PaddingTop(16)
                .Background("#7B3F00")
                .Padding(16)
                .Column(box =>
                {
                    box.Item().AlignCenter().Text("TOTAL AMOUNT").FontSize(9).FontColor("#FFCC80").LetterSpacing(0.05f);
                    box.Item().AlignCenter().PaddingTop(4)
                        .Text($"{r.Currency} {r.Amount:N2}")
                        .FontSize(24).Bold().FontColor("#FFFFFF");
                });

            col.Item().PaddingTop(16).Background("#F5F5F5").Padding(12).Column(note =>
            {
                note.Item().Text("Important Notes").FontSize(9).Bold().FontColor("#555555");
                note.Item().PaddingTop(4).Text(
                    "This is a system-generated receipt and does not require a signature. " +
                    "For disputes or queries, contact support@walletplatform.com.")
                    .FontSize(8.5f).FontColor("#777777").LineHeight(1.4f);
            });
        });
    }

    private static void ComposeFooter(IContainer container)
    {
        container.Column(col =>
        {
            col.Item().PaddingBottom(4).LineHorizontal(0.5f).LineColor("#E0D8CF");
            col.Item().Row(row =>
            {
                row.RelativeItem().Text($"Generated on {DateTime.UtcNow:dd MMM yyyy} UTC")
                    .FontSize(8).FontColor("#AAAAAA");
                row.RelativeItem().AlignRight()
                    .Text("WalletPlatform • Secure Digital Payments")
                    .FontSize(8).FontColor("#AAAAAA");
            });
        });
    }
}
