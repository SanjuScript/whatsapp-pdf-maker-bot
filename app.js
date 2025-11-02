const express = require("express");
const bodyParser = require("body-parser");
const { verifyWebhook, handleWebhook } = require("./controllers/whatsappController");
const { PORT } = require("./config");

const app = express();
app.use(bodyParser.json());

// ✅ Webhook setup
app.get("/webhook", verifyWebhook);
app.post("/webhook", handleWebhook);

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
