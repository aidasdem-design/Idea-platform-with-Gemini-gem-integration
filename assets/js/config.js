// Everything site-specific lives here. Nothing in this file is secret:
// the sheet is public (view-only) and the form accepts anonymous responses.
export const CONFIG = {
  sheetId: '1ZoZmq-xsA36rHeIvgD-OshH_TTbAWXffZjLa1M_AaDk',
  sheetTab: 'Ideas',

  formAction: 'https://docs.google.com/forms/d/e/1FAIpQLSd-2YQM3SygvDCEGMP9f-ys5Ww1gHWcyGQgMfUw2ba1mlOS7Q/formResponse',
  entries: {
    id: 'entry.1336213782',
    firstName: 'entry.1128910257',
    surname: 'entry.2120774900',
    title: 'entry.1301892608',
    problem: 'entry.379707694',
    requirements: 'entry.1436374929',
    suppliers: 'entry.2041529364',
    inputs: 'entry.429314310',
    process: 'entry.241044864',
    outputs: 'entry.1355997125',
    customers: 'entry.1676680367',
    frequency: 'entry.363614119',
  },

  githubUser: 'aidasdem-design',

  // Shared Gemini Gem running the interview. If emptied, "Open in Gemini"
  // falls back to copying the prompt and opening a blank Gemini chat.
  geminiGemUrl: 'https://gemini.google.com/gem/1S2bykcZUR7eNsCgnMrngiacLjI-MYy4R?usp=sharing',
};

// Sheet header → field key. Headers come from the Google Form question titles.
export const COLUMNS = {
  'Timestamp': 'timestamp',
  'ID': 'id',
  'First name': 'firstName',
  'Surname': 'surname',
  'Title': 'title',
  'Problem': 'problem',
  'Requirements': 'requirements',
  'Suppliers': 'suppliers',
  'Inputs': 'inputs',
  'Process': 'process',
  'Outputs': 'outputs',
  'Customers': 'customers',
  'Frequency & time spent': 'frequency',
  'Status': 'status',
};

export const STATUSES = ['New', 'Under review', 'In progress', 'Done', 'Declined'];
