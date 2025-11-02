const { PDFDocument } = require("pdf-lib");
const fs = require("fs");

exports.makePdf = async (images, name = "Document") => {
  const pdf = await PDFDocument.create();
  const A4 = [595, 842];

  for (const imgPath of images) {
    const imgBytes = fs.readFileSync(imgPath);
    const img = await pdf.embedJpg(imgBytes);
    const page = pdf.addPage(A4);

    const scale = Math.min(A4[0] / img.width, A4[1] / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    const x = (A4[0] - w) / 2;
    const y = (A4[1] - h) / 2;

    page.drawImage(img, { x, y, width: w, height: h });
  }

  const pdfBytes = await pdf.save();
  const safeName = name.replace(/[^a-zA-Z0-9_-]/g, "_");
  const output = `./${safeName}.pdf`;

  fs.writeFileSync(output, pdfBytes);
  console.log("🧾 PDF created:", output);
  return output;
};
