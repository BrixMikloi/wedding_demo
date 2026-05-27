mode: "no-cors"

const SHEET_NAME = "Sheet1"; // change if your sheet name is different

function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);

  const data = JSON.parse(e.postData.contents);

  const email = (data.email || "").trim().toLowerCase();

  const rows = sheet.getDataRange().getValues();

  // Skip header row (start at 1)
  for (let i = 1; i < rows.length; i++) {
    const existingEmail = String(rows[i][2]).trim().toLowerCase(); 
    // Column C = Email (0=A,1=B,2=C)

    if (existingEmail === email) {
      return ContentService
        .createTextOutput(JSON.stringify({
          status: "duplicate"
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  // Save new RSVP
  sheet.appendRow([
    new Date(),
    data.name,
    data.email,
    data.contact,
    data.attendance,
    data.guests,
    data.message,
    data.submittedAt
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({
      status: "success"
    }))
    .setMimeType(ContentService.MimeType.JSON);
}