const https = require("https");
const { ACCESS_TOKEN } = process.env;

// Function to create a task in ClickUp
async function createTask(taskData) {
  const options = {
    hostname: "api.clickup.com",
    path: `/api/v2/list/${taskData.list_id}/task`,
    method: "POST",
    headers: {
      Authorization: ACCESS_TOKEN,
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
        try {
          // Check if the response is JSON before parsing
          if (
            res.headers["content-type"] &&
            res.headers["content-type"].includes("application/json")
          ) {
            const parsedData = JSON.parse(data);
            resolve(parsedData);
          } else {
            reject(new Error("Unexpected response format. Expected JSON."));
          }
        } catch (error) {
          reject(new Error("Failed to parse API response: " + error.message));
        }
      });
    });

    req.on("error", (error) => {
      console.error("Error creating task: ", error);
      reject(error);
    });

    req.write(JSON.stringify(taskData));
    req.end();
  });
}

module.exports = {
  createTask,
};
