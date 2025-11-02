const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const { TOKEN, PHONE_NUMBER_ID } = require("../config");

const API = `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}`;

exports.getMediaUrl = async (mediaId) => {
  const res = await axios.get(`https://graph.facebook.com/v22.0/${mediaId}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  return res.data.url;
};

exports.sendText = async (to, body) => {
  await axios.post(
    `${API}/messages`,
    { messaging_product: "whatsapp", to, text: { body } },
    { headers: { Authorization: `Bearer ${TOKEN}` } }
  );
};

exports.sendInteractiveMenu = async (to) => {
  const data = {
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "list",
      header: {
        type: "text",
        text: "📋 PDF Tools Menu",
      },
      body: {
        text: "Select the service you want to use 👇",
      },
      footer: {
        text: "You can choose up to 10 options here.",
      },
      action: {
        button: "Open Menu",
        sections: [
          {
            title: "🛠 PDF Tools",
            rows: [
              {
                id: "make_pdf",
                title: "📄 Make PDF",
                description: "Convert images into a high-quality PDF.",
              },
              {
                id: "merge_pdfs",
                title: "🧩 Merge PDFs",
                description: "Combine multiple PDFs into one.",
              },
              {
                id: "remove_pages",
                title: "🗑️ Remove Pages",
                description: "Delete unwanted pages from a PDF.",
              },
              {
                id: "compress_pdf",
                title: "📦 Compress PDF",
                description: "Reduce PDF size without losing quality.",
              },
              {
                id: "enhance_pdf",
                title: "✨ Enhance PDF",
                description: "Improve sharpness, contrast, and clarity.",
              },
              {
                id: "split_pdf",
                title: "✂️ Split PDF",
                description: "Extract selected pages into a new PDF.",
              },
            ],
          },
        ],
      },
    },
  };

  await axios.post(`${API}/messages`, data, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
};


// 📄 Send PDF document
exports.sendDocument = async (to, filePath) => {
  const formData = new FormData();
  formData.append("file", fs.createReadStream(filePath));
  formData.append("type", "application/pdf");
  formData.append("messaging_product", "whatsapp");

  const upload = await axios.post(`${API}/media`, formData, {
    headers: { Authorization: `Bearer ${TOKEN}`, ...formData.getHeaders() },
  });

  const mediaId = upload.data.id;
  const fileName = filePath.split("/").pop();

  await axios.post(
    `${API}/messages`,
    {
      messaging_product: "whatsapp",
      to,
      type: "document",
      document: { id: mediaId, filename: fileName, caption: `📄 ${fileName}` },
    },
    { headers: { Authorization: `Bearer ${TOKEN}` } }
  );
};
