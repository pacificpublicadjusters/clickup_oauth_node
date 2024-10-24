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
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
}

// Fetch contact name by phone number
async function getContactNameByPhoneNumber(
  phoneNumber,
  accessToken,
  refreshToken
) {
  // Set the tokens dynamically
  setTokens(accessToken, refreshToken);

  const people = google.people({
    version: "v1",
    auth: oauth2Client,
  });

  try {
    const response = await people.people.searchContacts({
      query: phoneNumber,
      pageSize: 1,
      personFields: "names,phoneNumbers",
    });

    const contact = response.data.results[0];
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
};
