const express = require("express");
const https = require("https");
const dotenv = require("dotenv");
const { google } = require("googleapis");

dotenv.config();
const app = express();
app.use(express.json());

// Environment Variables
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const TEXT_LIST_ID = process.env.TEXT_LIST_ID || "901105537156"; // Fallback list ID for texts
const VOICEMAIL_LIST_ID = process.env.VOICEMAIL_LIST_ID || "901105262068"; // List ID for voicemails

// Global variable to store tokens
let oauthTokens = null;

// Google OAuth
const OAuth2 = google.auth.OAuth2;
const oauth2Client = new OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);
const SCOPES = ["https://www.googleapis.com/auth/contacts.readonly"];

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

    // Store tokens in global variable
    oauthTokens = tokens;
    oauth2Client.setCredentials(tokens);
    console.log("Tokens received and stored:", tokens);

    // Automatically refresh tokens when needed
    oauth2Client.on("tokens", (newTokens) => {
      oauthTokens = { ...oauthTokens, ...newTokens };
      console.log("Tokens updated:", oauthTokens);
    });

    res.send("Authentication successful! You can close this tab.");
  });
});

// Data
const { employeeIds, teams } = require("../utils/data/companyData");

// Helper function for making HTTPS requests
const makeApiRequest = (options, postData = null) => {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsedData = JSON.parse(data);
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(
              new Error(
                `API responded with status ${res.statusCode}: ${
                  parsedData.message || "Unknown error"
                }`
              )
            );
          } else {
            resolve(parsedData);
          }
        } catch (err) {
          reject(new Error("Failed to parse API response"));
        }
      });
    });

    req.on("error", (error) => reject(error));
    if (postData) req.write(postData);
    req.end();
  });
};

// Helper function to normalize phone numbers to +10000000000 format
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
  if (!oauthTokens) {
    console.error("No stored tokens available.");
    return {};
  }

  oauth2Client.setCredentials(oauthTokens); // Ensure OAuth2 client is using the tokens

  try {
    const service = google.people({ version: "v1", auth: oauth2Client });
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
        const formattedPhoneNumber = normalizePhoneNumber(phone.value); // Normalize the phone number
        contacts[formattedPhoneNumber] = name;
      });
    });

    return contacts;
  } catch (error) {
    console.error("Error fetching contacts:", error);
    return {};
  }
};

// Helper function for formatting date to Pacific Time
const formatDateToPacific = (dateString) => {
  const utcDate = new Date(dateString);
  const pacificOffset = -7; // Adjust this value if needed
  const pacificDate = new Date(
    utcDate.getTime() + pacificOffset * 60 * 60 * 1000
  );
  return pacificDate.toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  });
};

// Function to gather team details based on "to" number
const getTeamInfoByNumber = (toNumber) => {
  const team = teams.find((team) => team.number === toNumber);
  if (!team) return null;

  // Gather employee info based on employeeIds from the team
  const teamEmployees = team.employeeIds
    .map((id) => {
      const employee = employeeIds.find((emp) => emp.id === id);
      return employee ? { name: employee.name, userId: employee.id } : null;
    })
    .filter((emp) => emp !== null);

  return {
    teamName: team.team,
    employees: teamEmployees,
  };
};

// Root GET route to prevent 'Cannot GET /' error
app.get("/", (req, res) => {
  res.send("Server is running.");
});

// Webhook endpoint to handle both voicemails and texts
app.post("/webhook", async (req, res) => {
  const eventData = req.body;
  console.log("Incoming event data:", eventData);

  const eventType = eventData.type;
  const eventDataObject = eventData.data.object;

  // Fetch Google Contacts to match names with numbers
  const googleContacts = await getGoogleContacts();

  // Extract common data
  const callerNumber = normalizePhoneNumber(eventDataObject.from); // Clean and normalize caller number
  const numberDialed = eventDataObject.to;
  const time = formatDateToPacific(eventDataObject.createdAt);

  // Try to find caller name from Google Contacts
  const callerName = googleContacts[callerNumber] || callerNumber;

  // Get team info for the "to" phone number
  const teamInfo = getTeamInfoByNumber(numberDialed);
  if (!teamInfo) {
    console.error("No team found for this phone number:", numberDialed);
    return res
      .status(400)
      .send("Team not found for the provided phone number.");
  }

  let taskName;
  let taskDescription;
  let assignees;

  if (eventType === "call.completed") {
    const body = eventDataObject.voicemail
      ? `Voicemail link: ${eventDataObject.voicemail.url}`
      : "No voicemail available.";

    taskName = `New Voicemail to ${teamInfo.teamName}`;
    taskDescription = `New Voicemail\nFrom: ${callerName}\nTo: ${teamInfo.teamName}\nTime: ${time}\n${body}`;

    assignees = teamInfo.employees.map((emp) => emp.userId); // Get user IDs for assignees
    console.log(assignees);

    const taskData = JSON.stringify({
      name: taskName,
      description: taskDescription,
      status: "to do",
      priority: 2,
      assignees: assignees,
    });

    const options = {
      hostname: "api.clickup.com",
      path: `/api/v2/list/${VOICEMAIL_LIST_ID}/task`,
      method: "POST",
      headers: {
        Authorization: ACCESS_TOKEN,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(taskData),
      },
    };

    try {
      const responseData = await makeApiRequest(options, taskData);
      console.log("Task created for voicemail:", responseData);
      res.status(200).send("Webhook received and voicemail task created.");
    } catch (error) {
      console.error("Failed to create voicemail task:", error);
      res.status(500).send("Failed to create voicemail task.");
    }
  } else if (eventType === "message.received") {
    const messageContent = eventDataObject.body || "No message body.";

    // If media is included, append links to it
    let mediaInfo = "";
    if (eventDataObject.media && eventDataObject.media.length > 0) {
      const mediaLinks = eventDataObject.media
        .map((media) => `${media.type} link: ${media.url}`)
        .join("\n");
      mediaInfo = `\nAttached media:\n${mediaLinks}`;
    }

    taskName = `Text message to ${teamInfo.teamName}`;
    taskDescription = `New Text\nFrom: ${callerName}\nTo: ${teamInfo.teamName}\nTime: ${time}\nMessage: ${messageContent}${mediaInfo}`;

    assignees = teamInfo.employees.map((emp) => emp.userId); // Get user IDs for assignees

    const taskData = JSON.stringify({
      name: taskName,
      description: taskDescription,
      status: "to do",
      priority: 2,
      assignees: assignees,
    });

    const options = {
      hostname: "api.clickup.com",
      path: `/api/v2/list/${TEXT_LIST_ID}/task`,
      method: "POST",
      headers: {
        Authorization: ACCESS_TOKEN,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(taskData),
      },
    };

    try {
      const responseData = await makeApiRequest(options, taskData);
      console.log("Task created for text message:", responseData);
      res.status(200).send("Webhook received and text message task created.");
    } catch (error) {
      console.error("Failed to create text message task:", error);
      res.status(500).send("Failed to create text message task.");
    }
  } else {
    console.log(`Unhandled event type: ${eventType}`);
    res.status(200).send("Event type not handled.");
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;

/* 2 */
/* 2 */
/* 2 */
/* 2 */
/* 2 */
/* 2 */
/* 2 */
/* 2 */
/* 2 */
/* 2 */
/* 2 */
/* 2 */
/* 2 */
/* 2 */
/* 2 */

// const express = require("express");
// const https = require("https");
// const dotenv = require("dotenv");
// const fs = require("fs");
// const { google } = require("googleapis");

// dotenv.config();
// const app = express();
// app.use(express.json());

// // Environment Variables
// const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
// const TEXT_LIST_ID = process.env.TEXT_LIST_ID || "901105537156"; // Fallback list ID for texts
// const VOICEMAIL_LIST_ID = process.env.VOICEMAIL_LIST_ID || "901105262068"; // List ID for voicemails

// // Google OAuth
// const OAuth2 = google.auth.OAuth2;
// const oauth2Client = new OAuth2(
//   process.env.GOOGLE_CLIENT_ID,
//   process.env.GOOGLE_CLIENT_SECRET,
//   process.env.GOOGLE_REDIRECT_URI
// );
// const SCOPES = ["https://www.googleapis.com/auth/contacts.readonly"];

// // Token storage file path
// const TOKEN_PATH = "../googleTokens.json";

// // Load tokens from file (if they exist)
// const loadTokens = () => {
//   if (fs.existsSync(TOKEN_PATH)) {
//     const tokenData = fs.readFileSync(TOKEN_PATH);
//     return JSON.parse(tokenData);
//   }
//   return null;
// };

// // Save tokens to file
// const saveTokens = (tokens) => {
//   fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
// };

// // Google Cloud Console - Token setup
// app.get("/auth", (req, res) => {
//   const authUrl = oauth2Client.generateAuthUrl({
//     access_type: "offline",
//     scope: SCOPES,
//   });
//   res.redirect(authUrl);
// });

// app.get("/oauth2callback", (req, res) => {
//   const { code } = req.query;
//   oauth2Client.getToken(code, (err, tokens) => {
//     if (err) {
//       console.error("Error retrieving access token", err);
//       return res.send("Error retrieving access token");
//     }

//     // Save tokens and set credentials
//     saveTokens(tokens);
//     oauth2Client.setCredentials(tokens);
//     console.log("Tokens received and saved:", tokens);

//     // Automatically refresh tokens when needed
//     oauth2Client.on("tokens", (newTokens) => {
//       saveTokens(newTokens);
//     });

//     res.send("Authentication successful! You can close this tab.");
//   });
// });

// // Data
// const { employeeIds, teams } = require("../utils/data/companyData");

// // Helper function for making HTTPS requests
// const makeApiRequest = (options, postData = null) => {
//   return new Promise((resolve, reject) => {
//     const req = https.request(options, (res) => {
//       let data = "";
//       res.on("data", (chunk) => (data += chunk));
//       res.on("end", () => {
//         try {
//           const parsedData = JSON.parse(data);
//           if (res.statusCode < 200 || res.statusCode >= 300) {
//             reject(
//               new Error(
//                 `API responded with status ${res.statusCode}: ${
//                   parsedData.message || "Unknown error"
//                 }`
//               )
//             );
//           } else {
//             resolve(parsedData);
//           }
//         } catch (err) {
//           reject(new Error("Failed to parse API response"));
//         }
//       });
//     });

//     req.on("error", (error) => reject(error));
//     if (postData) req.write(postData);
//     req.end();
//   });
// };

// // Helper function to normalize phone numbers to +10000000000 format
// const normalizePhoneNumber = (phone) => {
//   let normalized = phone.replace(/[^\d]/g, ""); // Remove non-digit characters
//   if (normalized.length === 10) {
//     normalized = `+1${normalized}`; // Assuming US country code
//   } else if (!normalized.startsWith("+")) {
//     normalized = `+${normalized}`;
//   }
//   return normalized;
// };

// // Helper function to fetch Google Contacts
// const getGoogleContacts = async () => {
//   const tokens = loadTokens();
//   if (!tokens) {
//     console.error("No stored tokens available.");
//     return {};
//   }

//   oauth2Client.setCredentials(tokens); // Ensure OAuth2 client is using the tokens

//   try {
//     const service = google.people({ version: "v1", auth: oauth2Client });
//     const response = await service.people.connections.list({
//       resourceName: "people/me",
//       pageSize: 1000,
//       personFields: "names,phoneNumbers",
//     });
//     const connections = response.data.connections || [];
//     const contacts = {};

//     // Create a lookup for phone numbers and their associated contact names
//     connections.forEach((person) => {
//       const name = person.names ? person.names[0].displayName : null;
//       const phoneNumbers = person.phoneNumbers || [];
//       phoneNumbers.forEach((phone) => {
//         const formattedPhoneNumber = normalizePhoneNumber(phone.value); // Normalize the phone number
//         contacts[formattedPhoneNumber] = name;
//       });
//     });

//     return contacts;
//   } catch (error) {
//     console.error("Error fetching contacts:", error);
//     return {};
//   }
// };

// // Helper function for formatting date to Pacific Time
// const formatDateToPacific = (dateString) => {
//   const utcDate = new Date(dateString);
//   const pacificOffset = -7; // Adjust this value if needed
//   const pacificDate = new Date(
//     utcDate.getTime() + pacificOffset * 60 * 60 * 1000
//   );
//   return pacificDate.toLocaleString("en-US", {
//     year: "numeric",
//     month: "long",
//     day: "numeric",
//     hour: "2-digit",
//     minute: "2-digit",
//     second: "2-digit",
//     timeZoneName: "short",
//   });
// };

// // Function to gather team details based on "to" number
// const getTeamInfoByNumber = (toNumber) => {
//   const team = teams.find((team) => team.number === toNumber);
//   if (!team) return null;

//   // Gather employee info based on employeeIds from the team
//   const teamEmployees = team.employeeIds
//     .map((id) => {
//       const employee = employeeIds.find((emp) => emp.id === id);
//       return employee ? { name: employee.name, userId: employee.id } : null;
//     })
//     .filter((emp) => emp !== null);

//   return {
//     teamName: team.team,
//     employees: teamEmployees,
//   };
// };

// // Root GET route to prevent 'Cannot GET /' error
// app.get("/", (req, res) => {
//   res.send("Server is running.");
// });

// // Webhook endpoint to handle both voicemails and texts
// app.post("/webhook", async (req, res) => {
//   const eventData = req.body;
//   console.log("Incoming event data:", eventData);

//   const eventType = eventData.type;
//   const eventDataObject = eventData.data.object;

//   // Fetch Google Contacts to match names with numbers
//   const googleContacts = await getGoogleContacts();

//   // Extract common data
//   const callerNumber = normalizePhoneNumber(eventDataObject.from); // Clean and normalize caller number
//   const numberDialed = eventDataObject.to;
//   const time = formatDateToPacific(eventDataObject.createdAt);

//   // Try to find caller name from Google Contacts
//   const callerName = googleContacts[callerNumber] || callerNumber;

//   // Get team info for the "to" phone number
//   const teamInfo = getTeamInfoByNumber(numberDialed);
//   if (!teamInfo) {
//     console.error("No team found for this phone number:", numberDialed);
//     return res
//       .status(400)
//       .send("Team not found for the provided phone number.");
//   }

//   let taskName;
//   let taskDescription;
//   let assignees;

//   if (eventType === "call.completed") {
//     const body = eventDataObject.voicemail
//       ? `Voicemail link: ${eventDataObject.voicemail.url}`
//       : "No voicemail available.";

//     taskName = `New Voicemail to ${teamInfo.teamName}`;
//     taskDescription = `New Voicemail\nFrom: ${callerName}\nTo: ${teamInfo.teamName}\nTime: ${time}\n${body}`;

//     assignees = teamInfo.employees.map((emp) => emp.userId); // Get user IDs for assignees
//     console.log(assignees);

//     const taskData = JSON.stringify({
//       name: taskName,
//       description: taskDescription,
//       status: "to do",
//       priority: 2,
//       assignees: assignees,
//     });
//     console.log(taskData);

//     const options = {
//       hostname: "api.clickup.com",
//       path: `/api/v2/list/${VOICEMAIL_LIST_ID}/task`,
//       method: "POST",
//       headers: {
//         Authorization: ACCESS_TOKEN,
//         "Content-Type": "application/json",
//         "Content-Length": Buffer.byteLength(taskData),
//       },
//     };

//     try {
//       const responseData = await makeApiRequest(options, taskData);
//       console.log("Task created for voicemail:", responseData);
//       res.status(200).send("Webhook received and voicemail task created.");
//     } catch (error) {
//       console.error("Failed to create voicemail task:", error);
//       res.status(500).send("Failed to create voicemail task.");
//     }
//   } else if (eventType === "message.received") {
//     const messageContent = eventDataObject.body || "No message body.";

//     // If media is included, append links to it
//     let mediaInfo = "";
//     if (eventDataObject.media && eventDataObject.media.length > 0) {
//       const mediaLinks = eventDataObject.media
//         .map((media) => `${media.type} link: ${media.url}`)
//         .join("\n");
//       mediaInfo = `\nAttached media:\n${mediaLinks}`;
//     }

//     taskName = `Text message to ${teamInfo.teamName}`;
//     taskDescription = `New Text\nFrom: ${callerName}\nTo: ${teamInfo.teamName}\nTime: ${time}\nMessage: ${messageContent}${mediaInfo}`;

//     assignees = teamInfo.employees.map((emp) => emp.userId); // Get user IDs for assignees

//     const taskData = JSON.stringify({
//       name: taskName,
//       description: taskDescription,
//       status: "to do",
//       priority: 2,
//       assignees: assignees,
//     });
//     console.log(taskData);

//     const options = {
//       hostname: "api.clickup.com",
//       path: `/api/v2/list/${TEXT_LIST_ID}/task`,
//       method: "POST",
//       headers: {
//         Authorization: ACCESS_TOKEN,
//         "Content-Type": "application/json",
//         "Content-Length": Buffer.byteLength(taskData),
//       },
//     };

//     try {
//       const responseData = await makeApiRequest(options, taskData);
//       console.log("Task created for text message:", responseData);
//       res.status(200).send("Webhook received and text message task created.");
//     } catch (error) {
//       console.error("Failed to create text message task:", error);
//       res.status(500).send("Failed to create text message task.");
//     }
//   } else {
//     console.log(`Unhandled event type: ${eventType}`);
//     res.status(200).send("Event type not handled.");
//   }
// });

// // Start the server
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });

// module.exports = app;

/* 3 */
/* 3 */
/* 3 */
/* 3 */
/* 3 */
/* 3 */
/* 3 */
/* 3 */
/* 3 */
/* 3 */
/* 3 */
/* 3 */
/* 3 */
/* 3 */
/* 3 */
/* 3 */
/* 3 */
/* 3 */
/* 3 */
/* 3 */

// const express = require("express");
// const https = require("https");
// const dotenv = require("dotenv");
// const { google } = require("googleapis");
// const fs = require("fs");
// const path = require("path");

// dotenv.config();
// const app = express();
// app.use(express.json());

// // Environment Variables
// const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
// const TEXT_LIST_ID = process.env.TEXT_LIST_ID || "901105537156"; // Fallback list ID for texts
// const VOICEMAIL_LIST_ID = process.env.VOICEMAIL_LIST_ID || "901105262068"; // List ID for voicemails

// // Path to store the Google OAuth tokens
// const tokensPath = path.join(__dirname, "googleTokens.json");

// // Google OAuth
// const OAuth2 = google.auth.OAuth2;
// const oauth2Client = new OAuth2(
//   process.env.GOOGLE_CLIENT_ID,
//   process.env.GOOGLE_CLIENT_SECRET,
//   process.env.GOOGLE_REDIRECT_URI
// );

// const { employeeIds, teams } = require("../utils/data/companyData");

// // Scopes for Google Contacts API
// const SCOPES = ["https://www.googleapis.com/auth/contacts.readonly"];

// // Helper function to load tokens from the file
// const loadTokens = () => {
//   try {
//     if (fs.existsSync(tokensPath)) {
//       const tokens = fs.readFileSync(tokensPath, "utf8");
//       console.log("Tokens loaded from file:", tokens);
//       return JSON.parse(tokens);
//     }
//     console.log("No tokens file found.");
//   } catch (error) {
//     console.error("Error loading tokens:", error);
//   }
//   return null;
// };

// // Helper function to save tokens to the file
// const saveTokens = (tokens) => {
//   try {
//     fs.writeFileSync(tokensPath, JSON.stringify(tokens), "utf8");
//     console.log("Tokens saved to file.");
//   } catch (error) {
//     console.error("Error saving tokens:", error);
//   }
// };

// // Load tokens on startup
// let googleTokens = loadTokens();
// if (googleTokens) {
//   oauth2Client.setCredentials(googleTokens);
// }

// // Google OAuth2 authentication
// app.get("/auth", (req, res) => {
//   const authUrl = oauth2Client.generateAuthUrl({
//     access_type: "offline",
//     scope: SCOPES,
//   });
//   res.redirect(authUrl);
// });

// app.get("/oauth2callback", (req, res) => {
//   const { code } = req.query;
//   oauth2Client.getToken(code, (err, tokens) => {
//     if (err) return res.send("Error retrieving access token");

//     // Store the tokens
//     googleTokens = tokens;
//     oauth2Client.setCredentials(tokens);
//     saveTokens(tokens);

//     // Automatically refresh tokens when needed
//     oauth2Client.on("tokens", (newTokens) => {
//       googleTokens = { ...googleTokens, ...newTokens };
//       saveTokens(googleTokens);
//     });

//     res.send("Authentication successful! You can close this tab.");
//   });
// });

// // Helper function to make API requests
// const makeApiRequest = (options, postData = null) => {
//   return new Promise((resolve, reject) => {
//     const req = https.request(options, (res) => {
//       let data = "";
//       res.on("data", (chunk) => (data += chunk));
//       res.on("end", () => {
//         try {
//           const parsedData = JSON.parse(data);
//           if (res.statusCode < 200 || res.statusCode >= 300) {
//             reject(
//               new Error(
//                 `API responded with status ${res.statusCode}: ${
//                   parsedData.message || "Unknown error"
//                 }`
//               )
//             );
//           } else {
//             resolve(parsedData);
//           }
//         } catch (err) {
//           reject(new Error("Failed to parse API response"));
//         }
//       });
//     });

//     req.on("error", (error) => reject(error));
//     if (postData) req.write(postData);
//     req.end();
//   });
// };

// // Helper function to normalize phone numbers
// const normalizePhoneNumber = (phone) => {
//   let normalized = phone.replace(/[^\d]/g, ""); // Remove non-digit characters
//   if (normalized.length === 10) {
//     normalized = `+1${normalized}`; // Assuming US country code
//   } else if (!normalized.startsWith("+")) {
//     normalized = `+${normalized}`;
//   }
//   return normalized;
// };

// // Helper function to fetch Google Contacts
// const getGoogleContacts = async () => {
//   if (!googleTokens) {
//     console.error("No stored tokens available.");
//     return {};
//   }

//   oauth2Client.setCredentials(googleTokens);

//   const service = google.people({ version: "v1", auth: oauth2Client });
//   try {
//     const response = await service.people.connections.list({
//       resourceName: "people/me",
//       pageSize: 1000,
//       personFields: "names,phoneNumbers",
//     });
//     const connections = response.data.connections || [];
//     const contacts = {};

//     connections.forEach((person) => {
//       const name = person.names ? person.names[0].displayName : null;
//       const phoneNumbers = person.phoneNumbers || [];
//       phoneNumbers.forEach((phone) => {
//         const formattedPhoneNumber = normalizePhoneNumber(phone.value);
//         contacts[formattedPhoneNumber] = name;
//       });
//     });

//     return contacts;
//   } catch (error) {
//     console.error("Error fetching contacts:", error);
//     return {};
//   }
// };

// // Helper function to format dates to Pacific Time
// const formatDateToPacific = (dateString) => {
//   const utcDate = new Date(dateString);
//   const pacificOffset = -7; // Adjust this value if needed
//   const pacificDate = new Date(
//     utcDate.getTime() + pacificOffset * 60 * 60 * 1000
//   );
//   return pacificDate.toLocaleString("en-US", {
//     year: "numeric",
//     month: "long",
//     day: "numeric",
//     hour: "2-digit",
//     minute: "2-digit",
//     second: "2-digit",
//     timeZoneName: "short",
//   });
// };

// // Function to gather team details based on "to" number
// const getTeamInfoByNumber = (toNumber) => {
//   const team = teams.find((team) => team.number === toNumber);
//   if (!team) return null;

//   // Gather employee info based on employeeIds from the team
//   const teamEmployees = team.employeeIds
//     .map((id) => {
//       const employee = employeeIds.find((emp) => emp.id === id);
//       return employee ? { name: employee.name, userId: employee.id } : null;
//     })
//     .filter((emp) => emp !== null);

//   return {
//     teamName: team.team,
//     employees: teamEmployees,
//   };
// };

// // Root GET route
// app.get("/", (req, res) => {
//   res.send("Server is running.");
// });

// // Webhook endpoint to handle voicemails and texts
// app.post("/webhook", async (req, res) => {
//   const eventData = req.body;
//   console.log("Incoming event data:", eventData);

//   const eventType = eventData.type;
//   const eventDataObject = eventData.data.object;

//   // Fetch Google Contacts to match names with numbers
//   const googleContacts = await getGoogleContacts();

//   // Extract common data
//   const callerNumber = normalizePhoneNumber(eventDataObject.from); // Clean and normalize caller number
//   const numberDialed = eventDataObject.to;
//   const time = formatDateToPacific(eventDataObject.createdAt);

//   // Try to find caller name from Google Contacts
//   const callerName = googleContacts[callerNumber] || callerNumber;

//   // Get team info for the "to" phone number
//   const teamInfo = getTeamInfoByNumber(numberDialed);
//   if (!teamInfo) {
//     console.error("No team found for this phone number:", numberDialed);
//     return res
//       .status(400)
//       .send("Team not found for the provided phone number.");
//   }

//   let taskName;
//   let taskDescription;
//   let assignees;

//   if (eventType === "call.completed") {
//     const body = eventDataObject.voicemail
//       ? `Voicemail link: ${eventDataObject.voicemail.url}`
//       : "No voicemail available.";

//     taskName = `New Voicemail to ${teamInfo.teamName}`;
//     taskDescription = `New Voicemail\nFrom: ${callerName}\nTo: ${teamInfo.teamName}\nTime: ${time}\n${body}`;

//     assignees = teamInfo.employees.map((emp) => emp.userId); // Get user IDs for assignees

//     const taskData = JSON.stringify({
//       name: taskName,
//       description: taskDescription,
//       status: "to do",
//       priority: 2,
//       assignees: assignees,
//     });

//     const options = {
//       hostname: "api.clickup.com",
//       path: `/api/v2/list/${VOICEMAIL_LIST_ID}/task`,
//       method: "POST",
//       headers: {
//         Authorization: ACCESS_TOKEN,
//         "Content-Type": "application/json",
//         "Content-Length": Buffer.byteLength(taskData),
//       },
//     };

//     try {
//       const responseData = await makeApiRequest(options, taskData);
//       console.log("Task created for voicemail:", responseData);
//       res.status(200).send("Webhook received and voicemail task created.");
//     } catch (error) {
//       console.error("Failed to create voicemail task:", error);
//       res.status(500).send("Failed to create voicemail task.");
//     }
//   } else if (eventType === "message.received") {
//     const messageContent = eventDataObject.body || "No message body.";

//     // If media is included, append links to it
//     let mediaInfo = "";
//     if (eventDataObject.media && eventDataObject.media.length > 0) {
//       const mediaLinks = eventDataObject.media
//         .map((media) => `${media.type} link: ${media.url}`)
//         .join("\n");
//       mediaInfo = `\nAttached media:\n${mediaLinks}`;
//     }

//     taskName = `Text message to ${teamInfo.teamName}`;
//     taskDescription = `New Text\nFrom: ${callerName}\nTo: ${teamInfo.teamName}\nTime: ${time}\nMessage: ${messageContent}${mediaInfo}`;

//     assignees = teamInfo.employees.map((emp) => emp.userId); // Get user IDs for assignees

//     const taskData = JSON.stringify({
//       name: taskName,
//       description: taskDescription,
//       status: "to do",
//       priority: 2,
//       assignees: assignees,
//     });

//     const options = {
//       hostname: "api.clickup.com",
//       path: `/api/v2/list/${TEXT_LIST_ID}/task`,
//       method: "POST",
//       headers: {
//         Authorization: ACCESS_TOKEN,
//         "Content-Type": "application/json",
//         "Content-Length": Buffer.byteLength(taskData),
//       },
//     };

//     try {
//       const responseData = await makeApiRequest(options, taskData);
//       console.log("Task created for text message:", responseData);
//       res.status(200).send("Webhook received and text message task created.");
//     } catch (error) {
//       console.error("Failed to create text message task:", error);
//       res.status(500).send("Failed to create text message task.");
//     }
//   } else {
//     console.log(`Unhandled event type: ${eventType}`);
//     res.status(200).send("Event type not handled.");
//   }
// });

// // Start the server
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });

// module.exports = app;
