const fs = require("fs");
const path = require("path");
const https = require("https");
const { VERIFY_TOKEN } = require("../config");
const {
  getMediaUrl,
  sendText,
  sendInteractiveMenu,
  sendDocument,
} = require("../services/whatsappService");
const { downloadAndEnhanceImage } = require("../services/imageService");
const { makePdf } = require("../services/pdfService");
const { removePagesFromPdf } = require("../services/pdfEditService");
const { mergePdfs } = require("../services/pdfMergeService");
const { compressPdf } = require("../services/pdfCompressService");

let userImages = {};
let userStates = {};
let userPdfFile = {};
let userMergeFiles = {};
let userCompressionQuality = {};

// ✅ Verify webhook
exports.verifyWebhook = (req, res) => {
  const mode = req.query["hub.mode"];
  const challenge = req.query["hub.challenge"];
  const token = req.query["hub.verify_token"];
  if (mode === "subscribe" && token === VERIFY_TOKEN)
    res.status(200).send(challenge);
  else res.sendStatus(403);
};

// ✅ Main webhook handler
exports.handleWebhook = async (req, res) => {
  try {
    const value = req.body.entry?.[0]?.changes?.[0]?.value;
    const msg = value?.messages?.[0];
    const contact = value?.contacts?.[0];

    if (!msg) return res.sendStatus(200);

    const from = msg.from;
    const type = msg.type;
    const userName = contact?.profile?.name || "there";

    if (
      type === "text" &&
      /\b(hi|hy|hyy|hai|halo|helo|hello|hey)\b/i.test(msg.text.body.trim())
    ) {
      await sendText(
        from,
        `👋 Hey *${userName}*! I'm *DocuBot 🤖*, your personal PDF assistant.\n\n` +
          `I can help you:\n` +
          `• 📄 Make PDFs from images\n` +
          `• ✂️ Remove pages\n` +
          `• 🧩 Merge PDFs\n` +
          `• 📦 Compress files\n\n` +
          `Let's get started! Choose a tool below 👇`
      );

      await sendInteractiveMenu(from);
      return res.sendStatus(200);
    }
    // Handle interactive menu selection
    if (type === "interactive") {
      const id =
        msg.interactive?.button_reply?.id || msg.interactive?.list_reply?.id;
      if (id) {
        await handleMenuSelection(from, id);
        return res.sendStatus(200);
      }
    }

    // 🖼️ Make PDF (image upload)
    if (type === "image" && userStates[from] === "make_pdf") {
      const imageId = msg.image.id;
      const imageUrl = await getMediaUrl(imageId);
      const imagePath = await downloadAndEnhanceImage(imageUrl);

      if (!userImages[from]) userImages[from] = [];
      userImages[from].push(imagePath);
      return res.sendStatus(200);
    }

    // 📄 PDF upload (remove / merge / compress)
    if (type === "document") {
      const docId = msg.document.id;
      const docUrl = await getMediaUrl(docId);
      const pdfPath = await downloadPdf(docUrl);

      // --- Remove Pages ---
      if (userStates[from] === "remove_pages") {
        userPdfFile[from] = pdfPath;
        await sendText(
          from,
          "✂️ Now send the *page numbers* to remove (e.g. `1 3 5`)."
        );
        userStates[from] = "await_remove_pages";
        return res.sendStatus(200);
      }

      // --- Merge PDFs ---
      if (userStates[from] === "merge_pdfs") {
        if (!userMergeFiles[from]) userMergeFiles[from] = [];
        userMergeFiles[from].push(pdfPath);
        return res.sendStatus(200);
      }

      // --- Compress PDF ---
      if (userStates[from] === "compress_pdf") {
        userPdfFile[from] = pdfPath;
        await sendText(
          from,
          "🔧 Please enter *compression quality (1–100)*.\n(1 = max compression, 100 = best quality)"
        );
        userStates[from] = "await_compression_quality";
        return res.sendStatus(200);
      }
    }

    // 💬 Handle text
    if (type === "text") {
      const text = msg.text.body.trim();

      // --- Make PDF ---
      if (userStates[from] === "make_pdf") {
        if (!userImages[from]?.length) {
          await sendText(from, "⚠️ Send images first, then type the PDF name.");
          return res.sendStatus(200);
        }

        const pdfName = text.replace(/[^a-zA-Z0-9_-]/g, "_") || "Document";
        await sendText(from, `🪄 Creating your PDF *${pdfName}.pdf*...`);

        const pdfPath = await makePdf(userImages[from], pdfName);
        await sendDocument(from, pdfPath);
        await sendText(from, "✅ Your enhanced PDF is ready! 📄✨");

        if (Math.random() < 0.2) {
          await sendText(from, "_🤖 DocuBot says thanks! — built by Sanjay_");
        }

        userImages[from].forEach((img) => fs.unlinkSync(img));
        delete userImages[from];
        userStates[from] = null;

        await sendInteractiveMenu(from);
        return res.sendStatus(200);
      }

      // --- Remove Pages ---
      if (userStates[from] === "await_remove_pages" && userPdfFile[from]) {
        const pagesToRemove = text
          .split(/\s+/)
          .map((n) => parseInt(n))
          .filter((n) => !isNaN(n));

        if (!pagesToRemove.length) {
          await sendText(from, "⚠️ Send valid page numbers (e.g. 1 2 5).");
          return res.sendStatus(200);
        }

        await sendText(from, "✂️ Removing selected pages...");
        const newPath = await removePagesFromPdf(
          userPdfFile[from],
          pagesToRemove
        );

        await sendDocument(from, newPath);
        await sendText(from, "✅ Pages removed successfully!");

        fs.unlinkSync(userPdfFile[from]);
        delete userPdfFile[from];
        userStates[from] = null;

        await sendInteractiveMenu(from);
        return res.sendStatus(200);
      }

      // --- Merge PDFs ---
      if (userStates[from] === "merge_pdfs") {
        const lower = text.toLowerCase().trim();

        if (lower.startsWith("done")) {
          if (!userMergeFiles[from]?.length) {
            await sendText(
              from,
              "⚠️ Send at least 2 PDFs before typing *done*."
            );
            return res.sendStatus(200);
          }

          const nameMatch = text.match(/done\s*(.*)/i);
          const pdfName = nameMatch?.[1]?.trim() || "Merged_Document";

          await sendText(from, `🪄 Merging PDFs into *${pdfName}.pdf*...`);
          const finalPath = await mergePdfs(userMergeFiles[from], pdfName);

          await sendDocument(from, finalPath);
          await sendText(from, "✅ Your merged PDF is ready! 📄✨");

          userMergeFiles[from].forEach((f) => fs.unlinkSync(f));
          delete userMergeFiles[from];
          userStates[from] = null;

          await sendInteractiveMenu(from);
          return res.sendStatus(200);
        }
      }

      // --- Await compression quality ---
      if (
        userStates[from] === "await_compression_quality" &&
        userPdfFile[from]
      ) {
        const quality = parseInt(text);
        if (isNaN(quality) || quality < 1 || quality > 100) {
          await sendText(from, "⚠️ Please send a number between 1 and 100.");
          return res.sendStatus(200);
        }

        const originalPdfPath = userPdfFile[from];
        const pdfName = path.basename(originalPdfPath, ".pdf");
        await sendText(
          from,
          `🔧 Compressing *${pdfName}.pdf* at ${quality}% quality...`
        );

        const compressedPath = await compressPdf(originalPdfPath, quality);
        await sendDocument(from, compressedPath);
        await sendText(from, "✅ Your compressed PDF is ready! 📦✨");

        // Cleanup
        fs.unlinkSync(originalPdfPath);
        fs.unlinkSync(compressedPath);
        delete userPdfFile[from];
        userStates[from] = null;

        await sendInteractiveMenu(from);
        return res.sendStatus(200);
      }

      // Default (menu)
      await sendInteractiveMenu(from);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Webhook error:", err.response?.data || err.message);
    res.sendStatus(500);
  }
};

// 📥 Download PDF helper
async function downloadPdf(url) {
  const { TOKEN } = require("../config");
  const filePath = `./pdf_${Date.now()}.pdf`;

  await new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filePath);
    https
      .get(url, { headers: { Authorization: `Bearer ${TOKEN}` } }, (res) => {
        if (res.statusCode !== 200)
          return reject(new Error(`Download failed: ${res.statusCode}`));
        res.pipe(file);
        file.on("finish", () => file.close(resolve));
      })
      .on("error", reject);
  });

  return filePath;
}

// 🧭 Handle menu choices
async function handleMenuSelection(from, id) {
  switch (id) {
    case "make_pdf":
      userStates[from] = "make_pdf";
      userImages[from] = [];
      await sendText(
        from,
        "📸 Send all images, then type *PDF name* when done."
      );
      break;
    case "remove_pages":
      userStates[from] = "remove_pages";
      await sendText(from, "📄 Send the *PDF file* to remove pages from.");
      break;
    case "merge_pdfs":
      userStates[from] = "merge_pdfs";
      userMergeFiles[from] = [];
      await sendText(
        from,
        "📎 Send all PDFs to merge, then type *done MyFile*."
      );
      break;
    case "compress_pdf":
      userStates[from] = "compress_pdf";
      await sendText(from, "📄 Send the *PDF file* you want to compress.");
      break;
    default:
      await sendInteractiveMenu(from);
  }
}

// 📥 Download received PDF file
async function downloadPdf(url) {
  const { TOKEN } = require("../config");
  const filePath = `./pdf_${Date.now()}.pdf`;

  await new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filePath);
    https
      .get(url, { headers: { Authorization: `Bearer ${TOKEN}` } }, (res) => {
        if (res.statusCode !== 200)
          return reject(new Error(`Download failed: ${res.statusCode}`));
        res.pipe(file);
        file.on("finish", () => file.close(resolve));
      })
      .on("error", reject);
  });

  return filePath;
}
