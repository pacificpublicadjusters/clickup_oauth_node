const express = require("express");
const https = require("https");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");

dotenv.config();
const app = express();
app.use(express.json());

// Environment Variables
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const TEXT_LIST_ID = process.env.TEXT_LIST_ID || "901105537156"; // Fallback list ID for texts
const VOICEMAIL_LIST_ID = process.env.VOICEMAIL_LIST_ID || "901105262068"; // List ID for voicemails

// Token storage file path
const TOKEN_PATH = path.join(__dirname, "googleTokens.json");

// Google OAuth
const OAuth2 = google.auth.OAuth2;
const oauth2Client = new OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);
const SCOPES = ["https://www.googleapis.com/auth/contacts.readonly"];

// Helper function to store tokens
const storeTokens = (tokens) => {
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens), (err) => {
    if (err) {
      console.error("Error saving tokens:", err);
      return;
    }
    console.log("Tokens stored to", TOKEN_PATH);
  });
};

// Helper function to load tokens
const loadTokens = () => {
  try {
    const tokenData = fs.readFileSync(TOKEN_PATH, "utf8");
    console.log("Loaded tokens from file:", TOKEN_PATH); // Log this to verify
    return JSON.parse(tokenData);
  } catch (err) {
    console.log("No stored tokens found.");
    return null;
  }
};

// Google Cloud Console - Token setup
app.get("/auth", (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
  });
  res.redirect(authUrl);
});

app.get("/oauth2callback", (req, res) => {
  const { code } = req.query;
  oauth2Client.getToken(code, (err, tokens) => {
    if (err) {
      console.error("Error retrieving access token", err);
      return res.send("Error retrieving access token");
    }

    // Store the access and refresh tokens
    oauth2Client.setCredentials(tokens);
    storeTokens(tokens);
    console.log("Tokens received and set:", tokens);

    oauth2Client.on("tokens", (newTokens) => {
      storeTokens({ ...tokens, ...newTokens });
    });

    res.send("Authentication successful! You can close this tab.");
  });
});

// Helper function to normalize phone numbers
const normalizePhoneNumber = (phone) => {
  let normalized = phone.replace(/[^\d]/g, ""); // Remove non-digit characters
  if (normalized.length === 10) {
    normalized = `+1${normalized}`; // Assuming US country code
  } else if (!normalized.startsWith("+")) {
    normalized = `+${normalized}`;
  }
  return normalized;
};

// Helper function to fetch Google Contacts
const getGoogleContacts = async () => {
  const storedTokens = loadTokens();
  if (!storedTokens) {
    console.error("No stored tokens available.");
    return {};
  }

  oauth2Client.setCredentials(storedTokens); // Use stored tokens
  console.log("OAuth2 client credentials set.");

  const service = google.people({ version: "v1", auth: oauth2Client });
  try {
    const response = await service.people.connections.list({
      resourceName: "people/me",
      pageSize: 1000,
      personFields: "names,phoneNumbers",
    });
    const connections = response.data.connections || [];
    const contacts = {};

    // Create a lookup for phone numbers and their associated contact names
    connections.forEach((person) => {
      const name = person.names ? person.names[0].displayName : null;
      const phoneNumbers = person.phoneNumbers || [];
      phoneNumbers.forEach((phone) => {
        const formattedPhoneNumber = normalizePhoneNumber(phone.value);
        contacts[formattedPhoneNumber] = name;
      });
    });

    return contacts;
  } catch (error) {
    console.error("Error fetching contacts", error);
    return {};
  }
};

// Root GET route
app.get("/", (req, res) => {
  res.send("Server is running.");
});

// Webhook endpoint to handle both voicemails and texts
app.post("/webhook", async (req, res) => {
  const eventData = req.body;
  console.log("Incoming event data:", eventData);

  const googleContacts = await getGoogleContacts();

  // Extract common data
  const callerNumber = normalizePhoneNumber(eventData.data.object.from);
  const callerName = googleContacts[callerNumber] || callerNumber;

  console.log("Caller Name:", callerName); // Log caller info

  // Other logic follows here...
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
