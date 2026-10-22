/**
 * One-time setup: creates the "Automation Ideas" Google Form, links it to the
 * ideas spreadsheet, adds a Status column with a dropdown, and logs the
 * pre-filled link + entry IDs the website needs.
 *
 * How to run:
 *   1. Go to https://script.google.com → New project
 *   2. Replace the default code with this file, click Save
 *   3. Select `createIdeaForm` in the toolbar and click Run
 *   4. Approve the permissions prompt (Advanced → Go to project if Google warns)
 *   5. Open View → Logs (Execution log) and copy everything below "=== RESULT ==="
 *
 * Run it only once — every run creates a new form and a new responses tab.
 */

const SHEET_ID = '1ZoZmq-xsA36rHeIvgD-OshH_TTbAWXffZjLa1M_AaDk';

const FIELDS = [
  ['ID', 'short'],
  ['First name', 'short'],
  ['Surname', 'short'],
  ['Title', 'short'],
  ['Problem', 'paragraph'],
  ['Requirements', 'paragraph'],
  ['Suppliers', 'paragraph'],
  ['Inputs', 'paragraph'],
  ['Process', 'paragraph'],
  ['Outputs', 'paragraph'],
  ['Customers', 'paragraph'],
  ['Frequency & time spent', 'short'],
];

const STATUSES = ['New', 'Under review', 'In progress', 'Done', 'Declined'];

function createIdeaForm() {
  const form = FormApp.create('Automation Ideas');
  form.setDescription('Submissions come from the Automation Ideas website. Please use the site instead of this form.');
  form.setCollectEmail(false);
  form.setLimitOneResponsePerUser(false);
  form.setAllowResponseEdits(false);
  form.setShowLinkToRespondAgain(false);

  // Only exists on Workspace accounts; consumer accounts never require login.
  try { form.setRequireLogin(false); } catch (e) {}
  // Newer Forms have an explicit "published" state; older runtimes lack this method.
  if (typeof form.setPublished === 'function') form.setPublished(true);

  FIELDS.forEach(([title, type]) =>
    type === 'paragraph' ? form.addParagraphTextItem().setTitle(title) : form.addTextItem().setTitle(title)
  );

  // Link responses to the spreadsheet (creates a "Form Responses N" tab).
  form.setDestination(FormApp.DestinationType.SPREADSHEET, SHEET_ID);
  SpreadsheetApp.flush();

  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheets().find(s => {
    const url = s.getFormUrl();
    return url && FormApp.openByUrl(url).getId() === form.getId();
  });
  if (!sheet) throw new Error('Linked responses tab not found — check the spreadsheet manually.');

  // Timestamp is column A, fields follow, Status goes right after them.
  const statusCol = FIELDS.length + 2;
  sheet.getRange(1, statusCol).setValue('Status').setFontWeight('bold');
  const rule = SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).setAllowInvalid(false).build();
  sheet.getRange(2, statusCol, sheet.getMaxRows() - 1, 1).setDataValidation(rule);

  logFormDetails(form, sheet);
}

/**
 * Recovery: if createIdeaForm already created and linked the form but failed
 * before printing the result, run this instead of re-running createIdeaForm.
 * It finds the most recently linked responses tab and logs the same details.
 */
function logExistingFormDetails() {
  const sheets = SpreadsheetApp.openById(SHEET_ID).getSheets().filter(s => s.getFormUrl());
  if (!sheets.length) throw new Error('No form-linked tab found in the spreadsheet.');
  const sheet = sheets[sheets.length - 1];
  logFormDetails(FormApp.openByUrl(sheet.getFormUrl()), sheet);
}

function logFormDetails(form, sheet) {
  // Entry IDs differ from item IDs; a pre-filled URL is the reliable way to get them.
  const items = form.getItems();
  const prefill = form.createResponse();
  items.forEach((item, i) => {
    const typed = item.getType() === FormApp.ItemType.PARAGRAPH_TEXT ? item.asParagraphTextItem() : item.asTextItem();
    prefill.withItemResponse(typed.createResponse('x' + (i + 1)));
  });
  const prefilledUrl = prefill.toPrefilledUrl();

  const entryIds = {};
  items.forEach((item, i) => {
    const title = item.getTitle();
    const match = prefilledUrl.match(new RegExp('entry\\.(\\d+)=x' + (i + 1) + '(?:&|$)'));
    entryIds[title] = match ? 'entry.' + match[1] : null;
  });

  const publishedUrl = form.getPublishedUrl();
  Logger.log('=== RESULT ===');
  Logger.log('Form edit URL:      ' + form.getEditUrl());
  Logger.log('Form public URL:    ' + publishedUrl);
  Logger.log('Submit endpoint:    ' + publishedUrl.replace(/\/viewform.*$/, '/formResponse'));
  Logger.log('Responses tab name: ' + sheet.getName());
  Logger.log('Pre-filled link:    ' + prefilledUrl);
  Logger.log('Entry IDs:          ' + JSON.stringify(entryIds, null, 2));
}
