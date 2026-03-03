using DevExpress.Pdf;
using DevExpress.Pdf.Drawing;
using DevExpress.Drawing;
using Microsoft.AspNetCore.Mvc;
using System.Drawing;
using System.Text.Json;

namespace demo_signatures.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SignPdfController : ControllerBase
    {
        [HttpPost("sign")]
        public async Task<IActionResult> Sign([FromForm] string signaturesData, IFormFile document)
        {
            if (string.IsNullOrEmpty(signaturesData))
                return BadRequest("No se recibieron firmas.");

            var signatures = JsonSerializer.Deserialize<List<SignatureRequest>>(signaturesData, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            if (signatures == null || signatures.Count == 0)
                return BadRequest("No se pudieron interpretar las firmas.");

            if (document == null || document.Length == 0)
                return BadRequest("No se recibió el documento PDF.");

            using (var msPdf = new MemoryStream())
            {
                await document.CopyToAsync(msPdf);
                msPdf.Position = 0;

                using (var processor = new PdfDocumentProcessor())
                {
                    processor.LoadDocument(msPdf);

                    for (int i = 0; i < processor.Document.Pages.Count; i++)
                    {
                        var pageSignatures = signatures.Where(s => s.PageIndex == i).ToList();
                        if (pageSignatures.Count > 0)
                        {
                            using (var graphics = processor.CreateGraphics())
                            {
                                var page = processor.Document.Pages[i];
                                double pdfWidth = page.CropBox.Width;
                                double pdfHeight = page.CropBox.Height;

                                foreach (var sig in pageSignatures)
                                {
                                    string base64Data = sig.SignatureBase64.Contains(",") 
                                        ? sig.SignatureBase64.Split(',')[1] 
                                        : sig.SignatureBase64;
                                    
                                    byte[] imageBytes = Convert.FromBase64String(base64Data);
      
                                    using (var ms = new MemoryStream(imageBytes))
                                    using (var dxImage = DXImage.FromStream(ms))
                                    {
                                        double xRatio = pdfWidth / sig.ViewportWidth;
                                        double yRatio = pdfHeight / sig.ViewportHeight;

                                        double x = sig.CoordX * xRatio;
                                        double y = sig.CoordY * yRatio;
                                            
                                        double sigWidth = sig.SignatureWidth * xRatio;
                                        double sigHeight = (sigWidth / dxImage.Width) * dxImage.Height;

                                        graphics.DrawImage(dxImage, new RectangleF((float)x, (float)y, (float)sigWidth, (float)sigHeight));
                                    }
                                }
                                graphics.AddToPageForeground(page, 72, 72);
                            }
                        }
                    }

                    var outStream = new MemoryStream();
                    processor.SaveDocument(outStream);
                    outStream.Position = 0;

                    return File(outStream.ToArray(), "application/pdf", "documento_firmado.pdf");
                }
            }
        }
    }

    public class SignatureRequest
    {
        public string SignatureBase64 { get; set; } = string.Empty;
        public int PageIndex { get; set; }
        public int CoordX { get; set; }
        public int CoordY { get; set; }
        public int ViewportWidth { get; set; }
        public int ViewportHeight { get; set; }
        public int SignatureWidth { get; set; }
    }
}
