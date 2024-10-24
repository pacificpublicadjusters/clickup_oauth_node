const express = require("express");
const router = express.Router();
const { handleVoicemail, handleText } = require("../services/openPhoneService");

// Handle POST requests to the /webhook route
router.post("/", async (req, res) => {
  try {
    const { type, data } = req.body;

    // Check if the event is a voicemail or a text message
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
    console.error("Error processing OpenPhone event:", error); // Log the error
    res.status(500).send("Internal server error"); // Send 500 status on failure
  }
});

module.exports = router;
