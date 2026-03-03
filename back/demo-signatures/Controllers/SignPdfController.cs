using DevExpress.Pdf;
using DevExpress.Pdf.Drawing;
using DevExpress.Drawing;
using Microsoft.AspNetCore.Mvc;
using System.Drawing;

namespace demo_signatures.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SignPdfController : ControllerBase
    {
        private readonly IWebHostEnvironment _env;

        public SignPdfController(IWebHostEnvironment env)
        {
            _env = env;
        }

        [HttpPost("sign")]
        public IActionResult Sign([FromBody] List<SignatureRequest> signatures)
        {
            if (signatures == null || signatures.Count == 0)
                return BadRequest("No se recibieron firmas.");

            string pdfPath = Path.Combine(_env.ContentRootPath, "file.pdf");
            if (!System.IO.File.Exists(pdfPath))
                return NotFound("El archivo PDF base no se encontró en el servidor.");

            using (var processor = new PdfDocumentProcessor())
            {
                processor.LoadDocument(pdfPath);

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
                                    double yWeb = sig.CoordY * yRatio;
                                        
                                    double sigWidth = sig.SignatureWidth * xRatio;
                                    double sigHeight = (sigWidth / dxImage.Width) * dxImage.Height;

                                    double y = pdfHeight - yWeb - sigHeight;

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
