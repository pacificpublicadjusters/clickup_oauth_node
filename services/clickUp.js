const https = require("https");
const { ACCESS_TOKEN } = process.env;

async function createTask(taskData) {
  console.log("Creating task with data:", taskData); // Add logging here to debug task data

  const options = {
    hostname: "api.clickup.com",
    path: `/api/v2/list/${taskData.list_id}/task`, // Ensure list_id is part of taskData
    method: "POST",
    headers: {
      Authorization: ACCESS_TOKEN, // Ensure the access token is set correctly
      "Content-Type": "application/json",
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        console.log("Response from ClickUp:", data); // Add logging for the response
        try {
          const parsedData = JSON.parse(data);
          if (res.statusCode >= 400) {
            console.error("ClickUp API error:", parsedData);
            reject(new Error(`ClickUp API error: ${parsedData.err}`));
          } else {
            resolve(parsedData);
          }
        } catch (error) {
          console.error("Failed to parse ClickUp API response:", data);
          reject(new Error("Failed to parse ClickUp API response"));
        }
      });
    });

    req.on("error", (error) => {
      console.error("Error making request to ClickUp:", error);
      reject(error);
    });

    req.write(JSON.stringify(taskData)); // Ensure the correct task data is being sent
    req.end();
  });
}

module.exports = {
  createTask,
};
