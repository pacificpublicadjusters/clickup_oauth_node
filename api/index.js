// const express = require("express");
// const https = require("https");
// const querystring = require("querystring");
// const dotenv = require("dotenv");

// dotenv.config();
// const app = express();
// app.use(express.json());

// const CLIENT_ID = process.env.CLIENT_ID;
// const CLIENT_SECRET = process.env.CLIENT_SECRET;
// const REDIRECT_URI = process.env.REDIRECT_URI;
// const ACCESS_TOKEN = process.env.ACCESS_TOKEN;

// const formatDate = (dateString) => {
//   const options = {
//     year: "numeric",
//     month: "long",
//     day: "numeric",
//     hour: "2-digit",
//     minute: "2-digit",
//     second: "2-digit",
//     timeZoneName: "short",
//   };

//   const date = new Date(dateString);
//   return date.toLocaleString("en-US", options);
// };

// app.get("/", (req, res) => {
//   res.send("Welcome to the ClickUp OAuth Node.js app!");
// });

// // OAuth endpoint to start the authorization process
// app.get("/auth", (req, res) => {
//   const clickupAuthUrl = `https://app.clickup.com/api?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}`;
//   res.redirect(clickupAuthUrl);
// });

// // Callback endpoint for OAuth
// app.get("/oauth/callback", (req, res) => {
//   const { code } = req.query;

//   const postData = querystring.stringify({
//     client_id: CLIENT_ID,
//     client_secret: CLIENT_SECRET,
//     code: code,
//     redirect_uri: REDIRECT_URI,
//   });

//   const options = {
//     hostname: "app.clickup.com",
//     path: "/api/v2/oauth/token",
//     method: "POST",
//     headers: {
//       "Content-Type": "application/x-www-form-urlencoded",
//       "Content-Length": postData.length,
//     },
//   };

//   const tokenRequest = https.request(options, (tokenResponse) => {
//     let data = "";

//     tokenResponse.on("data", (chunk) => {
//       data += chunk;
//     });

//     tokenResponse.on("end", () => {
//       const tokenInfo = JSON.parse(data);
//       if (tokenInfo.access_token) {
//         res.send(`Access token: ${tokenInfo.access_token}`);
//       } else {
//         res.status(400).send("Failed to obtain access token.");
//       }
//     });
//   });

//   tokenRequest.on("error", (error) => {
//     console.error("Error during token exchange:", error);
//     res.status(500).send("Something went wrong");
//   });

//   tokenRequest.write(postData);
//   tokenRequest.end();
// });

// app.get("/tasks", (req, res) => {
//   const options = {
//     hostname: "api.clickup.com",
//     path: "/api/v2/list/901105262068/task", // Replace YOUR_LIST_ID with the actual List ID
//     method: "GET",
//     headers: {
//       Authorization: ACCESS_TOKEN,
//     },
//   };

//   const apiRequest = https.request(options, (apiResponse) => {
//     let data = "";

//     apiResponse.on("data", (chunk) => {
//       data += chunk;
//     });

//     apiResponse.on("end", () => {
//       try {
//         const tasks = JSON.parse(data);
//         res.json(tasks);
//       } catch (err) {
//         res.status(500).send("Failed to parse response from ClickUp");
//       }
//     });
//   });

//   apiRequest.on("error", (error) => {
//     console.error("Error making API request:", error);
//     res.status(500).send("Error making API request");
//   });

//   apiRequest.end();
// });

// app.post("/webhook", (req, res) => {
//   const missedCallData = req.body;
//   console.log("Missed call data:", missedCallData);

//   const callerNumber = missedCallData.data.object.from;
//   const numberDialed = missedCallData.data.object.to;
//   const time = formatDate(missedCallData.data.object.createdAt);
//   const body = missedCallData.data.object.body;

//   const listId = "901105262068"; // list id

//   const taskData = JSON.stringify({
//     name: `Voicemail`,
//     description: `Missed call from ${callerNumber} to ${numberDialed} at ${time}. Message: ${body}`,
//     status: "to do",
//     priority: 2,
//   });

//   const options = {
//     hostname: "api.clickup.com",
//     path: `/api/v2/list/${listId}/task`,
//     method: "POST",
//     headers: {
//       Authorization: ACCESS_TOKEN,
//       "Content-Type": "application/json",
//       "Content-Length": Buffer.byteLength(taskData),
//     },
//   };

//   const apiRequest = https.request(options, (apiResponse) => {
//     let data = "";

//     apiResponse.on("data", (chunk) => {
//       data += chunk;
//     });

//     apiResponse.on("end", () => {
//       try {
//         const responseData = JSON.parse(data);
//         console.log("Task created:", responseData);
//         res.status(200).send("Webhook received and task created");
//       } catch (err) {
//         res.status(500).send("Failed to parse response from ClickUp");
//       }
//     });
//   });

//   apiRequest.on("error", (error) => {
//     console.error("Error making API request:", error);
//     res.status(500).send("Error creating task");
//   });

//   apiRequest.write(taskData);
//   apiRequest.end();
// });

// module.exports = app;

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
          resolve(parsedData);
        } catch (err) {
          reject(new Error("Failed to parse API response"));
        }
      });
    });

    req.on("error", reject);
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

// Root route
app.get("/", (req, res) => {
  res.send("Welcome to the ClickUp OAuth Node.js app!");
});

// OAuth endpoint to start the authorization process
app.get("/auth", (req, res) => {
  const clickupAuthUrl = `https://app.clickup.com/api?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}`;
  res.redirect(clickupAuthUrl);
});

// OAuth Callback
app.get("/oauth/callback", async (req, res) => {
  const { code } = req.query;
  const postData = querystring.stringify({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code,
    redirect_uri: REDIRECT_URI,
  });

  const options = {
    hostname: "app.clickup.com",
    path: "/api/v2/oauth/token",
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  };

  try {
    const tokenInfo = await makeApiRequest(options, postData);
    if (tokenInfo.access_token) {
      res.send(`Access token: ${tokenInfo.access_token}`);
    } else {
      res.status(400).send("Failed to obtain access token.");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Something went wrong during OAuth.");
  }
});

// Get tasks from ClickUp
app.get("/tasks", async (req, res) => {
  const options = {
    hostname: "api.clickup.com",
    path: `/api/v2/list/${LIST_ID}/task`,
    method: "GET",
    headers: {
      Authorization: ACCESS_TOKEN,
    },
  };

  try {
    const tasks = await makeApiRequest(options);
    res.json(tasks);
  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to fetch tasks.");
  }
});

// Webhook to create a task in ClickUp
app.post("/webhook", async (req, res) => {
  const missedCallData = req.body;
  console.log("Missed call data:", missedCallData);

  const callerNumber = missedCallData.data.object.from;
  const numberDialed = missedCallData.data.object.to;
  const time = formatDate(missedCallData.data.object.createdAt);
  const body = missedCallData.data.object.body || "No voicemail available.";

  const taskData = JSON.stringify({
    name: `Voicemail`,
    description: `Missed call from ${callerNumber} to ${numberDialed} at ${time}. Message: ${body}`,
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
    console.log("Task created:", responseData);
    res.status(200).send("Webhook received and task created.");
  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to create task.");
  }
});

module.exports = app;
