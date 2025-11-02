const fs = require("fs");
const path = require("path");
const { PDFDocument } = require("pdf-lib");
const sharp = require("sharp");

// Compress PDF with chosen quality (1–100)
exports.compressPdf = async (inputPath, quality = 60) => {
  const data = fs.readFileSync(inputPath);
  const pdfDoc = await PDFDocument.load(data);
  const pages = pdfDoc.getPages();

  // For each page, re-render and compress
  for (const page of pages) {
    const { width, height } = page.getSize();

    // Render page into an image (simulate)
    const jpegBytes = await sharp({
      create: { width, height, channels: 3, background: "#ffffff" },
    })
      .jpeg({ quality })
      .toBuffer();

    const img = await pdfDoc.embedJpg(jpegBytes);
    page.drawImage(img, { x: 0, y: 0, width, height });
  }

  const compressedBytes = await pdfDoc.save();
  const outputPath = path.join(
    path.dirname(inputPath),
    `${path.basename(inputPath, ".pdf")}_compressed.pdf`
  );
  fs.writeFileSync(outputPath, compressedBytes);

  return outputPath;
};
