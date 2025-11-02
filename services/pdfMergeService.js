const fs = require("fs");
const { PDFDocument } = require("pdf-lib");

exports.mergePdfs = async (pdfPaths, outputName) => {
  const mergedPdf = await PDFDocument.create();

  for (const pdfPath of pdfPaths) {
    const pdfBytes = fs.readFileSync(pdfPath);
    const pdf = await PDFDocument.load(pdfBytes);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  const finalPdf = await mergedPdf.save();
  const outputPath = `./${outputName.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;
  fs.writeFileSync(outputPath, finalPdf);
  return outputPath;
};
