const { google } = require("googleapis");
const { OAuth2 } = google.auth;
const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } =
  process.env;

// OAuth2 Client Setup
const oauth2Client = new OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
);

// Fetch contact name by phone number
async function getContactNameByPhoneNumber(phoneNumber) {
  // Token setup here (retrieving from ENV or dynamic logic)

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
    console.error("Error fetching contact: ", error);
    return null;
  }
}

module.exports = {
  getContactNameByPhoneNumber,
};
