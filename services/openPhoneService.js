const { createTask } = require("./clickUp");
const { TEXT_LIST_ID, VOICEMAIL_LIST_ID } = process.env;

// Handle incoming voicemail events
async function handleVoicemail(voicemailData) {
  const { from, voicemail, createdAt, to } = voicemailData;
  const time = new Date(createdAt).toLocaleString("en-US", { timeZone: "UTC" });

  const taskName = `New Voicemail to ${to}`;
  const taskDescription = `New Voicemail\nFrom: ${from}\nTo: ${to}\nTime: ${time}\nVoicemail link: ${voicemail.url} (Duration: ${voicemail.duration}s)`;

  const taskDetails = {
    name: taskName,
    description: taskDescription,
    list_id: VOICEMAIL_LIST_ID, // Ensure the voicemail list ID is being set here
  };

  console.log("Creating task with data:", taskDetails); // Add logging to debug
  await createTask(taskDetails);
}

// Handle incoming text message events
async function handleText(messageData) {
  const { from, body, media, createdAt, to } = messageData;
  const time = new Date(createdAt).toLocaleString("en-US", { timeZone: "UTC" });

  const taskName = `New Text to ${to}`;
  let taskDescription = `New Text\nFrom: ${from}\nTo: ${to}\nTime: ${time}\nMessage: ${body}`;

  if (media && media.length > 0) {
    const mediaLinks = media
      .map((item) => `Media URL: ${item.url} (Type: ${item.type})`)
      .join("\n");
    taskDescription += `\nAttached media:\n${mediaLinks}`;
  }

  const taskDetails = {
    name: taskName,
    description: taskDescription,
    list_id: TEXT_LIST_ID, // Ensure the text list ID is being set here
  };

  console.log("Creating task with data:", taskDetails); // Add logging to debug
  await createTask(taskDetails);
}

module.exports = {
  handleVoicemail,
  handleText,
};

// const { createTask } = require("./clickUp");
// const { getContactNameByPhoneNumber } = require("./googleContacts");
// const { TEXT_LIST_ID, VOICEMAIL_LIST_ID } = process.env;

// // Helper function to format Pacific Time
// function formatDateToPacific(dateString) {
//   const utcDate = new Date(dateString);
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
// }

// // Handle incoming voicemail events
// async function handleVoicemail(voicemailData) {
//   const { from, voicemail, createdAt, to, conversationId } = voicemailData;

//   const contactName = await getContactNameByPhoneNumber(from);
//   const time = formatDateToPacific(createdAt);

//   // Format task name and description as per original structure
//   const taskName = `New Voicemail to ${to}`;
//   const taskDescription = `New Voicemail\nFrom: ${
//     contactName || from
//   }\nTo: ${to}\nTime: ${time}\nVoicemail link: ${voicemail.url} (Duration: ${
//     voicemail.duration
//   }s)`;

//   const taskDetails = {
//     name: taskName,
//     description: taskDescription,
//     list_id: VOICEMAIL_LIST_ID,
//   };

//   await createTask(taskDetails);
// }

// // Handle incoming text message events
// async function handleText(messageData) {
//   const { from, body, media, createdAt, to, conversationId } = messageData;

//   const contactName = await getContactNameByPhoneNumber(from);
//   const time = formatDateToPacific(createdAt);

//   // Format task name and description as per original structure
//   const taskName = `New Text to ${to}`;
//   let taskDescription = `New Text\nFrom: ${
//     contactName || from
//   }\nTo: ${to}\nTime: ${time}\nMessage: ${body}`;

//   // If media is present, include it in the task description
//   if (media && media.length > 0) {
//     const mediaLinks = media
//       .map((item) => `Media URL: ${item.url} (Type: ${item.type})`)
//       .join("\n");
//     taskDescription += `\nAttached media:\n${mediaLinks}`;
//   }

//   const taskDetails = {
//     name: taskName,
//     description: taskDescription,
//     list_id: TEXT_LIST_ID,
//   };

//   await createTask(taskDetails);
// }

// module.exports = {
//   handleVoicemail,
//   handleText,
// };
