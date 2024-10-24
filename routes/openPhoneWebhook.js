const express = require("express");
const router = express.Router();
const { handleVoicemail, handleText } = require("../services/openPhoneService");

// Webhook route to handle incoming data from OpenPhone
router.post("/webhook", async (req, res) => {
  try {
    const { type, data } = req.body;

    if (type === "call.completed") {
      const { object } = data;
      if (object.direction === "incoming" && object.voicemail) {
        await handleVoicemail(object);
        return res.status(200).send("Voicemail processed");
      }
    } else if (type === "message.received") {
      const { object } = data;
      if (object.direction === "incoming") {
        await handleText(object);
        return res.status(200).send("Text message processed");
      }
    }

    return res.status(400).send("Unhandled event type or direction");
  } catch (error) {
    console.error("Error processing OpenPhone event: ", error);
    res.status(500).send("Internal server error");
  }
});

module.exports = router;
