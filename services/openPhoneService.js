const { createTask } = require("./clickUp");
const { TEXT_LIST_ID, VOICEMAIL_LIST_ID } = process.env;
const { employeeIds, teams } = require("../utils/data/companyData");
const { normalizePhoneNumber } = require("../utils/helpers");

// Helper function to get team info by phone number (cross-reference)
const getTeamInfoByNumber = (toNumber) => {
  const team = teams.find((team) => team.number === toNumber);
  if (!team) return null;

  const teamEmployees = team.employeeIds
    .map((id) => {
      const employee = employeeIds.find((emp) => emp.id === id);
      return employee ? { name: employee.name, userId: employee.id } : null;
    })
    .filter((emp) => emp !== null);

  return {
    teamName: team.team,
    employees: teamEmployees,
  };
};

// Handle incoming voicemail events
async function handleVoicemail(voicemailData) {
  const { from, voicemail, createdAt, to } = voicemailData;
  const time = new Date(createdAt).toLocaleString("en-US", { timeZone: "UTC" });

  const normalizedTo = normalizePhoneNumber(to);
  const teamInfo = getTeamInfoByNumber(normalizedTo);

  if (!teamInfo) {
    console.error("No team found for this phone number:", to);
    return;
  }

  const taskName = `New Voicemail to ${teamInfo.teamName}`;
  const taskDescription = `New Voicemail\nFrom: ${from}\nTo: ${teamInfo.teamName}\nTime: ${time}\nVoicemail link: ${voicemail.url} (Duration: ${voicemail.duration}s)`;

  const assignees = teamInfo.employees.map((emp) => emp.userId);

  const taskDetails = {
    name: taskName,
    description: taskDescription,
    list_id: VOICEMAIL_LIST_ID,
    assignees,
  };

  console.log("Creating task with data:", taskDetails);
  await createTask(taskDetails);
}

// Handle incoming text message events
async function handleText(messageData) {
  const { from, body, media, createdAt, to } = messageData;
  const time = new Date(createdAt).toLocaleString("en-US", { timeZone: "UTC" });

  const normalizedTo = normalizePhoneNumber(to);
  const teamInfo = getTeamInfoByNumber(normalizedTo);

  if (!teamInfo) {
    console.error("No team found for this phone number:", to);
    return;
  }

  const taskName = `New Text to ${teamInfo.teamName}`;
  let taskDescription = `New Text\nFrom: ${from}\nTo: ${teamInfo.teamName}\nTime: ${time}\nMessage: ${body}`;

  if (media && media.length > 0) {
    const mediaLinks = media
      .map((item) => `Media URL: ${item.url} (Type: ${item.type})`)
      .join("\n");
    taskDescription += `\nAttached media:\n${mediaLinks}`;
  }

  const assignees = teamInfo.employees.map((emp) => emp.userId);

  const taskDetails = {
    name: taskName,
    description: taskDescription,
    list_id: TEXT_LIST_ID,
    assignees,
  };

  console.log("Creating task with data:", taskDetails);
  await createTask(taskDetails);
}

module.exports = {
  handleVoicemail,
  handleText,
};
