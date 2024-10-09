const express = require("express");
const https = require("https");
const querystring = require("querystring");
const dotenv = require("dotenv");

dotenv.config();
const app = express();
app.use(express.json());

// Environment Variables
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const LIST_ID = process.env.LIST_ID || "901105262068"; // Fallback list ID

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

// Helper function for formatting date
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  });
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

  // Determine if the event is a call or text
  if (eventType === "call.completed") {
    // Process the completed call (voicemail or missed call)
    const callerNumber = eventDataObject.from;
    const numberDialed = eventDataObject.to;
    const time = formatDate(eventDataObject.createdAt);
    const body = eventDataObject.voicemail
      ? `Voicemail link: ${eventDataObject.voicemail.url}`
      : "No voicemail available.";

    const taskData = JSON.stringify({
      name: `Voicemail from ${callerNumber}`,
      description: `Missed call from ${callerNumber} to ${numberDialed} at ${time}. ${body}`,
      status: "to do",
      priority: 2,
    });

    const options = {
      hostname: "api.clickup.com",
      path: `/api/v2/list/${LIST_ID}/task`,
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
    const senderNumber = eventDataObject.from;
    const recipientNumber = eventDataObject.to;
    const time = formatDate(eventDataObject.createdAt);
    const messageContent = eventDataObject.body || "No message body.";

    // If media is included, append links to it
    let mediaInfo = "";
    if (eventDataObject.media && eventDataObject.media.length > 0) {
      const mediaLinks = eventDataObject.media
        .map((media) => `${media.type} link: ${media.url}`)
        .join("\n");
      mediaInfo = `\nAttached media:\n${mediaLinks}`;
    }

    const taskData = JSON.stringify({
      name: `Text message from ${senderNumber}`,
      description: `Text received from ${senderNumber} to ${recipientNumber} at ${time}. Message: ${messageContent}${mediaInfo}`,
      status: "to do",
      priority: 2,
    });

    const options = {
      hostname: "api.clickup.com",
      path: `/api/v2/list/${LIST_ID}/task`,
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
// const LIST_ID = process.env.LIST_ID || "901105262068"; // Fallback list ID

// // Helper function for making HTTPS requests
// const makeApiRequest = (options, postData = null) => {
//   return new Promise((resolve, reject) => {
//     const req = https.request(options, (res) => {
//       let data = "";
//       res.on("data", (chunk) => (data += chunk));
//       res.on("end", () => {
//         try {
//           const parsedData = JSON.parse(data);
//           resolve(parsedData);
//         } catch (err) {
//           reject(new Error("Failed to parse API response"));
//         }
//       });
//     });

//     req.on("error", reject);
//     if (postData) req.write(postData);
//     req.end();
//   });
// };

// // Helper function for formatting date
// const formatDate = (dateString) => {
//   return new Date(dateString).toLocaleString("en-US", {
//     year: "numeric",
//     month: "long",
//     day: "numeric",
//     hour: "2-digit",
//     minute: "2-digit",
//     second: "2-digit",
//     timeZoneName: "short",
//   });
// };

// // Root route
// app.get("/", (req, res) => {
//   res.send("Welcome to the ClickUp OAuth Node.js app!");
// });

// // OAuth endpoint to start the authorization process
// app.get("/auth", (req, res) => {
//   const clickupAuthUrl = `https://app.clickup.com/api?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}`;
//   res.redirect(clickupAuthUrl);
// });

// // OAuth Callback
// app.get("/oauth/callback", async (req, res) => {
//   const { code } = req.query;
//   const postData = querystring.stringify({
//     client_id: CLIENT_ID,
//     client_secret: CLIENT_SECRET,
//     code,
//     redirect_uri: REDIRECT_URI,
//   });

//   const options = {
//     hostname: "app.clickup.com",
//     path: "/api/v2/oauth/token",
//     method: "POST",
//     headers: {
//       "Content-Type": "application/x-www-form-urlencoded",
//     },
//   };

//   try {
//     const tokenInfo = await makeApiRequest(options, postData);
//     if (tokenInfo.access_token) {
//       res.send(`Access token: ${tokenInfo.access_token}`);
//     } else {
//       res.status(400).send("Failed to obtain access token.");
//     }
//   } catch (error) {
//     console.error(error);
//     res.status(500).send("Something went wrong during OAuth.");
//   }
// });

// // Get tasks from ClickUp
// app.get("/tasks", async (req, res) => {
//   const options = {
//     hostname: "api.clickup.com",
//     path: `/api/v2/list/${LIST_ID}/task`,
//     method: "GET",
//     headers: {
//       Authorization: ACCESS_TOKEN,
//     },
//   };

//   try {
//     const tasks = await makeApiRequest(options);
//     res.json(tasks);
//   } catch (error) {
//     console.error(error);
//     res.status(500).send("Failed to fetch tasks.");
//   }
// });

// // Webhook to create a task in ClickUp
// app.post("/webhook", async (req, res) => {
//   const missedCallData = req.body;
//   console.log("Missed call data:", missedCallData);

//   const callerNumber = missedCallData.data.object.from;
//   const numberDialed = missedCallData.data.object.to;
//   const time = formatDate(missedCallData.data.object.createdAt);
//   const body = missedCallData.data.object.body || "No voicemail available.";

//   const taskData = JSON.stringify({
//     name: `Voicemail`,
//     description: `Missed call from ${callerNumber} to ${numberDialed} at ${time}. Message: ${body}`,
//     status: "to do",
//     priority: 2,
//   });

//   const options = {
//     hostname: "api.clickup.com",
//     path: `/api/v2/list/${LIST_ID}/task`,
//     method: "POST",
//     headers: {
//       Authorization: ACCESS_TOKEN,
//       "Content-Type": "application/json",
//       "Content-Length": Buffer.byteLength(taskData),
//     },
//   };

//   try {
//     const responseData = await makeApiRequest(options, taskData);
//     console.log("Task created:", responseData);
//     res.status(200).send("Webhook received and task created.");
//   } catch (error) {
//     console.error(error);
//     res.status(500).send("Failed to create task.");
//   }
// });

// module.exports = app;
