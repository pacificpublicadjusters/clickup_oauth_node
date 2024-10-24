const { google } = require("googleapis");
const { OAuth2 } = google.auth;

// Initialize OAuth2 Client
const oauth2Client = new OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Function to dynamically set access and refresh tokens
function setTokens(accessToken, refreshToken) {
  if (!accessToken) {
    console.error("Error: Missing access token");
    throw new Error("Access token is missing");
  }
  console.log("Setting access token:", accessToken);
  if (refreshToken) {
    console.log("Setting refresh token:", refreshToken);
  }

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
}

// Function to refresh the access token if needed
async function refreshAccessToken() {
  try {
    const { credentials } = await oauth2Client.refreshAccessToken();
    oauth2Client.setCredentials(credentials);
    console.log("Access token refreshed:", credentials.access_token);
    return credentials;
  } catch (error) {
    console.error("Error refreshing access token:", error);
    throw error;
  }
}

// Function to fetch contact name by phone number
async function getContactNameByPhoneNumber(
  phoneNumber,
  accessToken,
  refreshToken
) {
  try {
    // Set the tokens dynamically before making the request
    setTokens(accessToken, refreshToken);

    const people = google.people({
      version: "v1",
      auth: oauth2Client,
    });

    const response = await people.people.searchContacts({
      query: phoneNumber,
      pageSize: 1,
      personFields: "names,phoneNumbers",
    });

    const contact = response.data.results[0];
    console.log("Contact search result:", contact);
    return contact ? contact.names[0].displayName : null;
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log("Access token expired. Refreshing token...");
      const newTokens = await refreshAccessToken();
      return getContactNameByPhoneNumber(
        phoneNumber,
        newTokens.access_token,
        newTokens.refresh_token
      );
    }
    console.error("Error fetching contact:", error);
    return null;
  }
}

module.exports = {
  getContactNameByPhoneNumber,
  setTokens,
  refreshAccessToken,
};
