function extractFileId(url) {
  const idMatch = url.match(/[-\w]{25,}/);
  return idMatch ? idMatch[0] : null;
}

function isSharedWithDomain(fileId, domain) {
  try {
    const permissions = Drive.Permissions.list(fileId).items || [];
    return permissions.some(p => p.type === "domain" && p.domain === domain);
  } catch (e) {
    Logger.log("Permission check failed: " + e.message);
    return false;
  }
}

function notifyUser(email, sheetUrl, submitter_email) {
  MailApp.sendEmail({
    to: email,
    subject: "🚨 Spreadsheet not shared with Jam City domain",
    body: `Please update sharing settings for:\n\n${sheetUrl} for ${submitter_email}`
  });
}


function tryShareSpreadsheet(url, row, sheet) {
  const spreadsheetId = extractFileId(url);
  const shareStatusColumn = COL.SHARE_STATUS;

  if (!spreadsheetId) {
    sheet.getRange(row, shareStatusColumn).setValue("Invalid URL");
    Logger.log(`Row ${row}: Invalid URL`);
    return;
  }

  try {
    const targetSpreadsheet = SpreadsheetApp.openById(spreadsheetId);
    targetSpreadsheet.addEditor(SHARE_EMAIL);
    sheet.getRange(row, shareStatusColumn).setValue("Shared");
    Logger.log(`Row ${row}: Shared spreadsheet ${spreadsheetId} with ${SHARE_EMAIL}`);
  } catch (err) {
    sheet.getRange(row, shareStatusColumn).setValue("Failed");
    Logger.log(`Row ${row}: Error sharing spreadsheet: ${err.message}`);
  }
}


function checkAndUpdatePermission(url, row, sheet, submitterEmail) {
  const permissionStatusColumn = COL.PERMISSION_STATUS;
  const domain = DOMAIN;
  const proj_owner = PROJ_OWNER;

  const fileId = extractFileId(url);
  if (!fileId) {
    sheet.getRange(row, permissionStatusColumn).setValue(PERMISSION_STATUS.INVALID);
    Logger.log(`Row ${row}: Invalid URL`);
    return;
  }

  const shared = isSharedWithDomain(fileId, domain);
  let newStatus = shared ? PERMISSION_STATUS.OK : PERMISSION_STATUS.DENIED;

  try {
    if (!shared) {
      notifyUser(submitterEmail, url, submitterEmail);
      notifyUser(proj_owner, url, submitterEmail);
    }
  } catch (err) {
    Logger.log(`Row ${row}: Error notifying users: ${err.message}`);
    newStatus = PERMISSION_STATUS.FAILED;
  }

  sheet.getRange(row, permissionStatusColumn).setValue(newStatus);
  Logger.log(`Row ${row}: Permission status updated to ${newStatus}`);
}

function getCurrentTimestamp() {
  return new Date().toISOString(); // or use Utilities.formatDate(...)
}

function validateEmail(email) {
  return /\S+@\S+\.\S+/.test(email);
}


function notifySlack(message) {
  if (!SLACK_WEBHOOK_URL) {
    Logger.log("Slack webhook URL not set.");
    return;
  }

  const payload = {
    text: message,
  };

  const options = {
    method: "POST",
    contentType: "application/json",
    payload: JSON.stringify(payload),
  };

  try {
    UrlFetchApp.fetch(SLACK_WEBHOOK_URL, options);
  } catch (error) {
    Logger.log("Slack notification failed: " + error.message);
  }
}

function getRowData(sheet, row) {
  const values = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
  return {
    email: values[COL.SUBMITTER_EMAIL - 1],
    url: values[COL.URL - 1],
    permissionStatus: values[COL.PERMISSION_STATUS - 1],
    shareStatus: values[COL.SHARE_STATUS - 1],
    internalStatus: values[COL.INTERNAL_STATUS - 1],
    dueDate: values[COL.DUE_DATE - 1],
    game: values[COL.GAME - 1],
    platform: values[COL.PLATFORM - 1],
    targetLanguages: values[COL.TARGET_LANGUAGES - 1],
    jobId: values[COL.JOB_ID - 1],
  };
}
