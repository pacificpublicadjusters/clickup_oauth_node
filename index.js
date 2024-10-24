const express = require("express");
const dotenv = require("dotenv");
dotenv.config();

// Initialize express app
const app = express();
app.use(express.json());

// Root route to avoid "cannot GET /"
app.get("/", (req, res) => res.send("Server is running!"));

// Webhook route - this is the main route that OpenPhone will hit
const openPhoneWebhook = require("./routes/openPhoneWebhook");
app.use("/webhook", openPhoneWebhook);

// Port listener
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
