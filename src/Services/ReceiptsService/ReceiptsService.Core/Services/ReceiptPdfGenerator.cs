using System.Globalization;
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
    private static readonly TimeZoneInfo IndiaTz = ResolveIndiaTimeZone();

    private static TimeZoneInfo ResolveIndiaTimeZone()
    {
        foreach (var id in new[] { "Asia/Kolkata", "India Standard Time" })
        {
            try { return TimeZoneInfo.FindSystemTimeZoneById(id); }
            catch (TimeZoneNotFoundException) { }
            catch (InvalidTimeZoneException) { }
        }

        return TimeZoneInfo.Utc;
    }

    /// <summary>Stored times are UTC; display in India Standard Time (IST).</summary>
    private static DateTime ToIndiaTime(DateTime utcOrUnspecified)
    {
        var utc = utcOrUnspecified.Kind switch
        {
            DateTimeKind.Utc => utcOrUnspecified,
            DateTimeKind.Local => utcOrUnspecified.ToUniversalTime(),
            _ => DateTime.SpecifyKind(utcOrUnspecified, DateTimeKind.Utc)
        };
        return TimeZoneInfo.ConvertTimeFromUtc(utc, IndiaTz);
    }

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
                page.Margin(36, Unit.Point);
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
                    left.Item().Text("Aurelian Wallet")
                        .FontSize(18).Bold().FontColor("#5D3A1A");
                    left.Item().PaddingTop(2).Text("Official payment receipt")
                        .FontSize(9).FontColor("#666666");
                });
                row.ConstantItem(88).Height(42).Background("#7B3F00")
                    .AlignCenter().AlignMiddle()
                    .Text("RECEIPT").FontColor("#FFFFFF").Bold().FontSize(10);
            });

            col.Item().PaddingTop(10).LineHorizontal(1f).LineColor("#D4C4B0");
        });
    }

    private static void ComposeContent(IContainer container, ReceiptDto r)
    {
        var typeColor = r.TransactionType.Equals("Transfer", StringComparison.OrdinalIgnoreCase) ? "#1B5E20" : "#0D47A1";
        var typeBg    = r.TransactionType.Equals("Transfer", StringComparison.OrdinalIgnoreCase) ? "#E8F5E9" : "#E3F2FD";

        container.PaddingTop(14).Column(col =>
        {
            col.Item().Row(row =>
            {
                row.RelativeItem().Text("TRANSACTION SUMMARY")
                    .FontSize(8).Bold().FontColor("#888888").LetterSpacing(0.08f);
                row.ConstantItem(92)
                    .Background(typeBg)
                    .Padding(5)
                    .AlignCenter()
                    .Text(r.TransactionType.ToUpperInvariant())
                    .FontSize(8).Bold()
                    .FontColor(typeColor);
            });

            col.Item().PaddingTop(12).Table(table =>
            {
                table.ColumnsDefinition(cols =>
                {
                    cols.ConstantColumn(118);
                    cols.RelativeColumn();
                });

                void Row(string label, string value, bool accent = false)
                {
                    var bg = accent ? "#FFF8F0" : "#FAFAFA";
                    table.Cell().Background(bg).PaddingVertical(6).PaddingHorizontal(8)
                        .Text(label).FontColor("#666666").FontSize(9);
                    table.Cell().Background(bg).PaddingVertical(6).PaddingHorizontal(8)
                        .Text(value).Bold().FontSize(9);
                }

                Row("Receipt reference", ShortId(r.Id));
                Row("Ledger transaction", ShortId(r.TransactionId));
                Row("Date & time (IST)", ToIndiaTime(r.TransactionDate).ToString("dd MMMM yyyy, hh:mm tt", CultureInfo.InvariantCulture));
                Row("Currency", r.Currency);
                Row("Amount", $"{r.Currency} {r.Amount:N2}", accent: true);
            });

            // Parties & wallet references
            col.Item().PaddingTop(14).Text("PARTIES & WALLET REFERENCES")
                .FontSize(8).Bold().FontColor("#888888").LetterSpacing(0.08f);

            col.Item().PaddingTop(6).Table(table =>
            {
                table.ColumnsDefinition(cols =>
                {
                    cols.ConstantColumn(100);
                    cols.RelativeColumn();
                });

                void PartyRow(string role, string walletLine, string userLine)
                {
                    table.Cell().Background("#F5F5F5").Padding(8)
                        .Text(role).FontColor("#555555").FontSize(8).Bold();
                    table.Cell().Background("#F5F5F5").Padding(8).Column(c =>
                    {
                        c.Item().Text(walletLine).FontSize(8.5f).FontColor("#333333");
                        c.Item().PaddingTop(2).Text(userLine).FontSize(8).FontColor("#666666");
                    });
                }

                PartyRow("Paid from (sender)",
                    $"Wallet ID · {MaskWallet(r.SenderWalletId)}",
                    $"Account user ID · {ShortId(r.SenderUserId)}");
                PartyRow("Paid to (receiver)",
                    $"Wallet ID · {MaskWallet(r.ReceiverWalletId)}",
                    $"Account user ID · {ShortId(r.ReceiverUserId)}");
            });

            if (!string.IsNullOrWhiteSpace(r.Memo))
            {
                col.Item().PaddingTop(14).Text("DETAILS")
                    .FontSize(8).Bold().FontColor("#888888").LetterSpacing(0.08f);
                col.Item().PaddingTop(6)
                    .Background("#F9F6F2")
                    .Border(0.5f)
                    .BorderColor("#E0D8CF")
                    .Padding(10)
                    .Column(noteCol =>
                    {
                        foreach (var line in r.Memo!.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
                            noteCol.Item().PaddingBottom(3).Text(line).FontSize(8.5f).FontColor("#444444").LineHeight(1.35f);
                    });
            }

            col.Item().PaddingTop(16)
                .Background("#7B3F00")
                .Padding(14)
                .Column(box =>
                {
                    box.Item().AlignCenter().Text("TOTAL PAID").FontSize(8).FontColor("#FFCC80").LetterSpacing(0.06f);
                    box.Item().AlignCenter().PaddingTop(4)
                        .Text($"{r.Currency} {r.Amount:N2}")
                        .FontSize(22).Bold().FontColor("#FFFFFF");
                });

            col.Item().PaddingTop(12).Background("#F5F5F5").Padding(10).Column(note =>
            {
                note.Item().Text("Important").FontSize(8).Bold().FontColor("#555555");
                note.Item().PaddingTop(4).Text(
                    "This document is system-generated for your records. Wallet IDs are masked for privacy. " +
                    "For support, contact your platform administrator with the ledger transaction reference above.")
                    .FontSize(8).FontColor("#777777").LineHeight(1.4f);
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
                row.RelativeItem().Text($"Generated {ToIndiaTime(DateTime.UtcNow):dd MMM yyyy, hh:mm tt} IST")
                    .FontSize(7.5f).FontColor("#AAAAAA");
                row.RelativeItem().AlignRight()
                    .Text("Aurelian · Secure digital wallet")
                    .FontSize(7.5f).FontColor("#AAAAAA");
            });
        });
    }

    private static string ShortId(Guid id)
    {
        var s = id.ToString("N").ToUpperInvariant();
        return $"{s[..8]}…{s[^4..]}";
    }

    private static string MaskWallet(Guid id) =>
        "····" + id.ToString("N")[^8..].ToUpperInvariant();
}
