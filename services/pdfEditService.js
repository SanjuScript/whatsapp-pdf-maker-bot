const fs = require("fs");
const { PDFDocument } = require("pdf-lib");

exports.removePagesFromPdf = async (inputPath, pagesToRemove) => {
  const pdfBytes = fs.readFileSync(inputPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);

  const totalPages = pdfDoc.getPageCount();
  const keepPages = [];
  for (let i = 0; i < totalPages; i++) {
    if (!pagesToRemove.includes(i + 1)) keepPages.push(i);
  }

  const newPdf = await PDFDocument.create();
  const copiedPages = await newPdf.copyPages(pdfDoc, keepPages);
  copiedPages.forEach((page) => newPdf.addPage(page));

  const newBytes = await newPdf.save();
  const outputPath = `./removed_${Date.now()}.pdf`;
  fs.writeFileSync(outputPath, newBytes);
  return outputPath;
};
