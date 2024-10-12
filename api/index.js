const express = require("express");
const https = require("https");
const dotenv = require("dotenv");

dotenv.config();
const app = express();
app.use(express.json());

// Environment Variables
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const TEXT_LIST_ID = process.env.TEXT_LIST_ID || "901105537156"; // Fallback list ID for texts
const VOICEMAIL_LIST_ID = "901105262068"; // List ID for voicemails

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

// Helper function for formatting date to Pacific Time
const formatDateToPacific = (dateString) => {
  const utcDate = new Date(dateString);
  // Convert UTC to Pacific Time (UTC-7 in summer, UTC-8 in winter)
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
      return employee ? { name: employee.name, email: employee.email } : null;
    })
    .filter((emp) => emp !== null);

  // Create team information object
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

  // Common data to extract for both voicemails and texts
  const callerNumber = eventDataObject.from;
  const numberDialed = eventDataObject.to;
  const time = formatDateToPacific(eventDataObject.createdAt);

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

  // Determine if the event is a call or text
  if (eventType === "call.completed") {
    // Process the completed call (voicemail or missed call)
    const body = eventDataObject.voicemail
      ? `Voicemail link: ${eventDataObject.voicemail.url}`
      : "No voicemail available.";

    taskName = `Voicemail from ${callerNumber}`;
    taskDescription = `Missed call from ${callerNumber} to ${teamInfo.teamName} at ${time}. ${body}`;

    const taskData = JSON.stringify({
      name: taskName,
      description: taskDescription,
      status: "to do",
      priority: 2,
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
    // Process the received text message
    const messageContent = eventDataObject.body || "No message body.";

    // If media is included, append links to it
    let mediaInfo = "";
    if (eventDataObject.media && eventDataObject.media.length > 0) {
      const mediaLinks = eventDataObject.media
        .map((media) => `${media.type} link: ${media.url}`)
        .join("\n");
      mediaInfo = `\nAttached media:\n${mediaLinks}`;
    }

    taskName = `Text message to ${teamInfo.teamName} from ${callerNumber}`;
    taskDescription = `Text received from ${callerNumber} to ${teamInfo.teamName} at ${time}. Message: ${messageContent}${mediaInfo}`;

    const taskData = JSON.stringify({
      name: taskName,
      description: taskDescription,
      status: "to do",
      priority: 2,
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
    // Ignore other event types for now
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
// const querystring = require("querystring");
// const dotenv = require("dotenv");

// dotenv.config();
// const app = express();
// app.use(express.json());

// // Environment Variables
// const CLIENT_ID = process.env.CLIENT_ID;
// const CLIENT_SECRET = process.env.CLIENT_SECRET;
// const REDIRECT_URI = process.env.REDIRECT_URI;
// const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
// const TEXT_LIST_ID = process.env.TEXT_LIST_ID || "901105537156"; // Fallback list ID for texts
// const VOICEMAIL_LIST_ID = "901105262068"; // List ID for voicemails

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

//   // Common data to extract for both voicemails and texts
//   const callerNumber = eventDataObject.from;
//   const numberDialed = eventDataObject.to;
//   const time = formatDateToPacific(eventDataObject.createdAt);

//   let taskName;
//   let taskDescription;

//   // Determine if the event is a call or text
//   if (eventType === "call.completed") {
//     // Process the completed call (voicemail or missed call)
//     const body = eventDataObject.voicemail
//       ? `Voicemail link: ${eventDataObject.voicemail.url}`
//       : "No voicemail available.";

//     taskName = `Voicemail from ${callerNumber}`;
//     taskDescription = `Missed call from ${callerNumber} to ${numberDialed} at ${time}. ${body}`;

//     const taskData = JSON.stringify({
//       name: taskName,
//       description: taskDescription,
//       status: "to do",
//       priority: 2,
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

//     taskName = `Text message from ${callerNumber}`;
//     taskDescription = `Text received from ${callerNumber} to ${numberDialed} at ${time}. Message: ${messageContent}${mediaInfo}`;

//     const taskData = JSON.stringify({
//       name: taskName,
//       description: taskDescription,
//       status: "to do",
//       priority: 2,
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
