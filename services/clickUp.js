const https = require("https");
const { ACCESS_TOKEN } = process.env;

// Function to create a task in ClickUp
async function createTask(taskData) {
  const options = {
    hostname: "api.clickup.com",
    path: "/api/v2/task",
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
        resolve(JSON.parse(data));
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
