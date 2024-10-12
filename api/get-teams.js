const https = require("https");
const dotenv = require("dotenv");

dotenv.config();

const ACCESS_TOKEN = process.env.ACCESS_TOKEN; // Your ClickUp API key

const options = {
  hostname: "api.clickup.com",
  path: "/api/v2/team",
  method: "GET",
  headers: {
    Authorization: ACCESS_TOKEN,
    "Content-Type": "application/json",
  },
};

const getTeams = () => {
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
            resolve(parsedData); // Resolve the team data
          }
        } catch (err) {
          reject(new Error("Failed to parse API response"));
        }
      });
    });

    req.on("error", (error) => reject(error));
    req.end();
  });
};

// Function to call the API and log the full team data
const run = async () => {
  try {
    const teamData = await getTeams();
    console.log("Full Team Data:", JSON.stringify(teamData, null, 2)); // Stringify to see nested arrays
  } catch (error) {
    console.error("Error fetching teams:", error);
  }
};

// Call the function
run();
