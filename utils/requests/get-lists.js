const https = require("https");
const dotenv = require("dotenv");
dotenv.config();

const accessToken = process.env.ACCESS_TOKEN;
const spaceId = "25601327";

const options = {
  hostname: "api.clickup.com",
  path: `/api/v2/space/${spaceId}/list`,
  method: "GET",
  headers: {
    Authorization: accessToken,
  },
};

https
  .request(options, (res) => {
    let data = "";
    res.on("data", (chunk) => {
      data += chunk;
    });

    res.on("end", () => {
      const lists = JSON.parse(data);
      console.log("Lists:", lists);
    });
  })
  .end();
