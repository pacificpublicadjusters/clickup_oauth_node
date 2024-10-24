// Helper function to normalize phone numbers to +10000000000 format
const normalizePhoneNumber = (phone) => {
  let normalized = phone.replace(/[^\d]/g, ""); // Remove non-digit characters
  if (normalized.length === 10) {
    normalized = `+1${normalized}`; // Assuming US country code
  } else if (!normalized.startsWith("+")) {
    normalized = `+${normalized}`;
  }
  return normalized;
};

module.exports = { normalizePhoneNumber };
