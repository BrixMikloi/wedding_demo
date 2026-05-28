const MEMORY_FOLDER_ID = "1Ipv6VtV-rJej1-hdexX2fW9y6x0Nf7Rv";

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || "{}");

    if (payload.action === "memoryUpload") {
      return saveMemoryUpload_(payload);
    }

    return json_({ status: "error", message: "Unknown action." });
  } catch (error) {
    return json_({ status: "error", message: error.message });
  }
}

function saveMemoryUpload_(payload) {
  const folder = DriveApp.getFolderById(MEMORY_FOLDER_ID);
  const uploadFolder = folder.createFolder(
    `${formatDate_()} - ${sanitize_(payload.guestName || "Guest Upload")}`
  );
  const savedFiles = [];

  (payload.files || []).forEach((file) => {
    const bytes = Utilities.base64Decode(file.data);
    const blob = Utilities.newBlob(bytes, file.type, sanitize_(file.name));
    const saved = uploadFolder.createFile(blob);
    savedFiles.push({ id: saved.getId(), name: saved.getName() });
  });

  const note = [
    `Guest: ${payload.guestName || "Not provided"}`,
    `Uploaded: ${payload.uploadedAt || new Date().toISOString()}`,
    "",
    payload.message || "No message provided.",
  ].join("\n");

  uploadFolder.createFile("message.txt", note, MimeType.PLAIN_TEXT);

  return json_({ status: "success", files: savedFiles });
}

function sanitize_(value) {
  return String(value || "upload")
    .replace(/[\\/:*?"<>|#%{}~&]/g, "-")
    .slice(0, 120);
}

function formatDate_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH.mm.ss");
}

function json_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
    ContentService.MimeType.JSON
  );
}
