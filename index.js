const express = require("express");
const https = require("https");
const querystring = require("querystring");
const dotenv = require("dotenv");

dotenv.config();
const app = express();

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
