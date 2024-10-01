const express = require("express");
const https = require("https");
const querystring = require("querystring");
const dotenv = require("dotenv");

dotenv.config();
const app = express();
app.use(express.json());

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;

const formatDate = (dateString) => {
  const options = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  };

  const date = new Date(dateString);
  return date.toLocaleString("en-US", options);
};

app.get("/", (req, res) => {
  res.send("Welcome to the ClickUp OAuth Node.js app!");
});

// OAuth endpoint to start the authorization process
app.get("/auth", (req, res) => {
  const clickupAuthUrl = `https://app.clickup.com/api?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}`;
  res.redirect(clickupAuthUrl);
});

// Callback endpoint for OAuth
app.get("/oauth/callback", (req, res) => {
  const { code } = req.query;

  const postData = querystring.stringify({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code: code,
    redirect_uri: REDIRECT_URI,
  });

  const options = {
    hostname: "app.clickup.com",
    path: "/api/v2/oauth/token",
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Length": postData.length,
    },
  };

  const tokenRequest = https.request(options, (tokenResponse) => {
    let data = "";

    // Accumulate data chunks
    tokenResponse.on("data", (chunk) => {
      data += chunk;
    });

    // When the response is complete
    tokenResponse.on("end", () => {
      const tokenInfo = JSON.parse(data);
      const accessToken = tokenInfo.access_token;
      res.send(`Access token: ${accessToken}`);
    });
  });

  tokenRequest.on("error", (error) => {
    console.error("Error during token exchange:", error);
    res.status(500).send("Something went wrong");
  });

  // Write the post data and end the request
  tokenRequest.write(postData);
  tokenRequest.end();
});

app.get("/tasks", (req, res) => {
  const options = {
    hostname: "api.clickup.com",
    path: "/api/v2/list/901105211466/task", // Replace YOUR_LIST_ID with the actual List ID
    method: "GET",
    headers: {
      Authorization: ACCESS_TOKEN,
    },
  };

  const apiRequest = https.request(options, (apiResponse) => {
    let data = "";

    apiResponse.on("data", (chunk) => {
      data += chunk;
    });

    apiResponse.on("end", () => {
      const tasks = JSON.parse(data);
      res.json(tasks);
    });
  });

  apiRequest.on("error", (error) => {
    console.error("Error making API request:", error);
    res.status(500).send("Error making API request");
  });

  apiRequest.end();
});

app.post("/webhook", (req, res) => {
  // Handle the incoming data from OpenPhone
  const missedCallData = req.body; // Assuming body-parser is used for JSON parsing
  console.log("Missed call data:", missedCallData);

  // missed call data
  const callerNumber = missedCallData.data.object.from;
  const numberDialed = missedCallData.data.object.to;
  const time = formatDate(missedCallData.data.object.createdAt);
  const body = missedCallData.data.object.body;

  const listId = "901105211466";

  // Create a task in ClickUp
  const taskData = JSON.stringify({
    name: `Voicemail`,
    description: `Missed call from ${callerNumber} to ${numberDialed} at ${time}. Message: ${body}`,
    status: "to do", // Change this to your desired status
    priority: 2, // Set priority as needed
  });

  const options = {
    hostname: "api.clickup.com",
    path: `/api/v2/list/${listId}/task`,
    method: "POST",
    headers: {
      Authorization: ACCESS_TOKEN,
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(taskData),
    },
  };

  const apiRequest = https.request(options, (apiResponse) => {
    let data = "";

    apiResponse.on("data", (chunk) => {
      data += chunk;
    });

    apiResponse.on("end", () => {
      const responseData = JSON.parse(data);
      console.log("Task created:", responseData);
      res.status(200).send("Webhook received and task created");
    });
  });

  apiRequest.on("error", (error) => {
    console.error("Error making API request:", error);
    res.status(500).send("Error creating task");
  });

  // Write the task data and end the request
  apiRequest.write(taskData);
  apiRequest.end();
});

module.exports = app;
