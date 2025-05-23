function authorizeScript() {
  const file = SpreadsheetApp.getActiveSpreadsheet();
  const email = "testaccount@crafty-almanac-230819.iam.gserviceaccount.com";
  file.addEditor(email);
}
