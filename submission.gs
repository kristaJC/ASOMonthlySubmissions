function processNewSubmission(rowValues, targetSheet) {
  const targetRow = targetSheet.getLastRow() + 1;
  targetSheet.getRange(targetRow, 1, 1, rowValues.length).setValues([rowValues]);

  const url = rowValues[SUBMISSION_COLS.URL - 1];
  const email = rowValues[SUBMISSION_COLS.SUBMITTER_EMAIL - 1];
  const fileId = extractFileId(url);

  if (!fileId) {
    blockRowWithError(targetSheet, targetRow, "Invalid URL", email, url);
    return;
  }

  const valid = validateUserSubmissionSheet(fileId, targetSheet, targetRow, email);
  if (!valid.valid) {
    targetSheet.getRange(targetRow, SUBMISSION_COLS.INTERNAL_STATUS).setValue("Blocked: Invalid Data");
    return;
  }

  checkAndUpdatePermission(url, targetRow, targetSheet, email);
  tryShareSpreadsheet(url, targetRow, targetSheet);
}

function updateWorkingCopyFromForm() {
  const formSheet = SpreadsheetApp
    .openById(WORKBOOKS.FORM_RAW_ID)
    .getSheetByName(FORM_RAW);

  const processingWorkbook = SpreadsheetApp.openById(WORKBOOKS.PROCESSING_SHEET_ID);
  const workingSheet = processingWorkbook.getSheetByName(PROCESSING_TABS.SUBMISSIONS);

  const rawData = formSheet.getDataRange().getValues();

  workingSheet.clearContents();
  workingSheet.getRange(1, 1, rawData.length, rawData[0].length).setValues(rawData);

  Logger.log(`✅ Synced ${rawData.length - 1} rows from form responses to working copy.`);
}
