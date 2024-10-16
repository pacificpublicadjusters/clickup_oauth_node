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

// Google OAuth
const OAuth2 = google.auth.OAuth2;
const oauth2Client = new OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);
const SCOPES = ["https://www.googleapis.com/auth/contacts.readonly"];

// Google Cloud Console
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
    if (err) return res.send("Error retrieving access token");
    oauth2Client.setCredentials(tokens);
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
        const formattedPhoneNumber = normalizePhoneNumber(phone.value); // Normalize the phone number
        console.log(normalizePhoneNumber);
        contacts[formattedPhoneNumber] = name;
      });
    });

    console.log(contacts);
    return contacts;
  } catch (error) {
    console.error("Error fetching contacts", error);
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
  console.log(callerNumber);
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
    console.log(taskData);

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
    console.log(taskData);

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

// const express = require("express");
// const https = require("https");
// const dotenv = require("dotenv");

// dotenv.config();
// const app = express();
// app.use(express.json());

// // Environment Variables
// const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
// const TEXT_LIST_ID = process.env.TEXT_LIST_ID || "901105537156"; // Fallback list ID for texts
// const VOICEMAIL_LIST_ID = process.env.VOICEMAIL_LIST_ID || "901105262068"; // List ID for voicemails

// // Google Cloud Console
// const { google } = require("googleapis");
// const OAuth2 = google.auth.OAuth2;
// const oauth2Client = new OAuth2(
//   process.env.GOOGLE_CLIENT_ID,
//   process.env.GOOGLE_CLIENT_SECRET,
//   process.env.GOOGLE_REDIRECT_URI
// );
// const SCOPES = ["https://www.googleapis.com/auth/contacts.readonly"];

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

// // Helper function for formatting date to Pacific Time
// const formatDateToPacific = (dateString) => {
//   const utcDate = new Date(dateString);
//   // Convert UTC to Pacific Time (UTC-7 in summer, UTC-8 in winter)
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

//   // Create team information object
//   return {
//     teamName: team.team,
//     employees: teamEmployees,
//   };
// };

// // Root GET route to prevent 'Cannot GET /' error
// app.get("/", (req, res) => {
//   res.send("Server is running.");
// });

// // Google Cloud Console
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
//     oauth2Client.setCredentials(tokens);
//     res.send("Authentication successful! You can close this tab.");
//   });
// });

// app.get("/contacts", async (req, res) => {
//   const service = google.people({ version: "v1", auth: oauth2Client });
//   try {
//     const response = await service.people.connections.list({
//       resourceName: "people/me",
//       pageSize: 1000,
//       personFields: "names,phoneNumbers",
//     });
//     const connections = response.data.connections || [];
//     res.json(connections);
//   } catch (error) {
//     res.status(500).send("Error fetching contacts");
//   }
// });

// // Webhook endpoint to handle both voicemails and texts
// app.post("/webhook", async (req, res) => {
//   const eventData = req.body;
//   console.log("Incoming event data:", eventData);

//   const eventType = eventData.type;
//   const eventDataObject = eventData.data.object;

//   // Common data to extract for both voicemails and texts
//   const callerNumber = eventDataObject.from;
//   const numberDialed = eventDataObject.to;
//   const time = formatDateToPacific(eventDataObject.createdAt);

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
//   let assignees; // Array to hold user IDs for assigning tasks

//   // Determine if the event is a call or text
//   if (eventType === "call.completed") {
//     // Process the completed call (voicemail or missed call)
//     const body = eventDataObject.voicemail
//       ? `Voicemail link: ${eventDataObject.voicemail.url}`
//       : "No voicemail available.";

//     taskName = `New Voicemail to ${teamInfo.teamName}`;
//     taskDescription = `New Voicemail. Please complete this task when addressed.\nFrom: ${callerNumber}\nTo: ${teamInfo.teamName}\nTime: ${time}\nLink: ${body}`;

//     assignees = teamInfo.employees.map((emp) => emp.userId); // Get user IDs for assignees

//     console.log(assignees);

//     const taskData = JSON.stringify({
//       name: taskName,
//       description: taskDescription,
//       status: "to do",
//       priority: 2,
//       assignees: assignees, // Assign to all relevant employees
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
//     // Process the received text message
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
//     taskDescription = `New Text. Please complete this task when addressed.\nFrom: ${callerNumber}\nTo: ${teamInfo.teamName}\nTime: ${time}\nMessage: ${messageContent}${mediaInfo}`;

//     assignees = teamInfo.employees.map((emp) => emp.userId); // Get user IDs for assignees

//     const taskData = JSON.stringify({
//       name: taskName,
//       description: taskDescription,
//       status: "to do",
//       priority: 2,
//       assignees: assignees, // Assign to all relevant employees
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
//     // Ignore other event types for now
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
