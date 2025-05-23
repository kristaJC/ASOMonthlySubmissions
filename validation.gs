function validateUserSubmissionSheet(fileId, sheet, rowIndex, submitterEmail) {
  const result = runTabStructureValidation(fileId); // defined below

  // Update validation status in the submissions sheet
  const statusCol = SUBMISSION_COLS.DATA_VALIDATION_STATUS;
  const status = result.valid ? "OK!" : "Invalid";

  sheet.getRange(rowIndex, statusCol).setValue(status);

  if (!result.valid) {
    Logger.log(`Validation failed: ${result.errors.join("\n")}`);

    // Optional: notify submitter
    MailApp.sendEmail({
      to: submitterEmail,
      subject: "Submission Failed Validation",
      body: `Hi,\n\nWe couldn’t process your spreadsheet due to the following issues:\n\n${result.errors.join("\n")}\n\nPlease update and resubmit.\n\nThanks!`
    });
  }

  return result;
}

function runTabStructureValidation(fileId) {
  const errors = [];
  const spreadsheet = SpreadsheetApp.openById(fileId);

  const iosSheet = spreadsheet.getSheetByName("ios");
  const androidSheet = spreadsheet.getSheetByName("android");

  if (!iosSheet) errors.push("Missing 'ios' tab.");
  if (!androidSheet) errors.push("Missing 'android' tab.");

  if (iosSheet) {
    const iosData = iosSheet.getDataRange().getValues().slice(3); // skip headers
    iosData.forEach((row, i) => {
      const filled = row.filter(cell => cell !== "").length;
      if (filled !== 3) {
        errors.push(`ios row ${i + 4} has ${filled} filled cells (expected 3).`);
      }
    });
  }

  if (androidSheet) {
    const androidData = androidSheet.getDataRange().getValues().slice(3);
    androidData.forEach((row, i) => {
      const filled = row.filter(cell => cell !== "").length;
      if (filled !== 2) {
        errors.push(`android row ${i + 4} has ${filled} filled cells (expected 2).`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
