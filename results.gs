/* Assume databricks payload
{
  "job_id": "db-job-abc123",
  "result_data": [["col1", "col2"], ["val1", "val2"], ...],
  "submission_email": "user@jamcity.com",
  "result_type": "final", // or "qa"
  "notes": "Job completed successfully"
}
*/

function doPost(e) {
  try {
    const processingBook = SpreadsheetApp.openById(WORKBOOKS.PROCESSING_SHEET_ID);
    const sheet = processingBook.getSheetByName(PROCESSING_TABS.IN_PROGRESS);
    const data = sheet.getDataRange().getValues();

    const payload = JSON.parse(e.postData.contents);
    const jobId = payload.job_id;
    const resultData = payload.result_data;
    const resultType = payload.result_type || "final";
    const submitterEmail = payload.submission_email;
    const notes = payload.notes || "";

    if (!jobId || !resultData || !Array.isArray(resultData)) {
      throw new Error("Missing or malformed payload fields.");
    }

    // Find row by job ID
    const jobCol = SUBMISSION_COLS.JOB_ID - 1;
    const rowIndex = data.findIndex((row, idx) => idx > 0 && row[jobCol] == jobId);
    if (rowIndex === -1) {
      throw new Error(`Job ID ${jobId} not found in In Progress tab.`);
    }

    const sheetRow = rowIndex + 1;
    const resultSheetUrl = createResultSheet(resultData, resultType, jobId);

    sheet.getRange(sheetRow, SUBMISSION_COLS.RESULT_SHEET_URL).setValue(resultSheetUrl);
    sheet.getRange(sheetRow, SUBMISSION_COLS.INTERNAL_STATUS).setValue("Complete");
    sheet.getRange(sheetRow, SUBMISSION_COLS.JOB_COMPLETED_AT).setValue(new Date());

    Logger.log(`✅ Job ${jobId} result processed and written.`);

    return ContentService.createTextOutput(
      JSON.stringify({ status: "success", job_id: jobId })
    ).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log(`❌ doPost error: ${err.message}`);
    return ContentService.createTextOutput(
      JSON.stringify({ status: "error", message: err.message })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}



function createResultSheet(data, resultType, jobId) {
  const ss = SpreadsheetApp.create(`Job Result - ${jobId}`);
  const sheet = ss.getSheets()[0];
  sheet.setName(resultType === "qa" ? "Proofing Format" : "Final Output");

  sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
  sheet.getRange(1, 1, 1, data[0].length).setFontWeight("bold");

  // Optional: add more formatting here if needed

  return ss.getUrl();
}
