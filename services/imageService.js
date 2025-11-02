const https = require("https");
const fs = require("fs");
const sharp = require("sharp");
const { TOKEN } = require("../config");

exports.downloadAndEnhanceImage = async (url) => {
  const raw = `./raw_${Date.now()}.jpg`;
  const enhanced = `./enhanced_${Date.now()}.jpg`;

  await new Promise((resolve, reject) => {
    const file = fs.createWriteStream(raw);
    https
      .get(url, { headers: { Authorization: `Bearer ${TOKEN}` } }, (res) => {
        res.pipe(file);
        file.on("finish", () => file.close(resolve));
      })
      .on("error", reject);
  });

  await sharp(raw)
    .resize({ width: 1080, withoutEnlargement: true })
    .modulate({ brightness: 1.2, saturation: 1.05 })
    .sharpen()
    .normalize()
    .toFile(enhanced);

  fs.unlinkSync(raw);
  return enhanced;
};
