require("dotenv").config();

console.log("🔑 Using token:", process.env.TOKEN ? "Loaded ✅" : "Missings ❌");

module.exports = {
  PORT: process.env.PORT || 3000,
  TOKEN: process.env.TOKEN,
  PHONE_NUMBER_ID: process.env.PHONE_NUMBER_ID,
  VERIFY_TOKEN: process.env.VERIFY_TOKEN,
};
