# Automation Idea Desk

A small static website where colleagues submit ideas for automating repetitive work. An AI interviewer helps each person turn a rough idea into clear requirements and a SIPOC process map. The site runs on GitHub Pages with no server and no API keys, and it stores everything in a Google Sheet.

- **Landing page:** welcome, a contact block, and the public idea board (date, ID, title, status)
- **Submit page:** your name → AI interview → paste the summary → review → submit
- **Request page:** the full details and current status of one idea

---

## The idea

People notice automation opportunities all the time ("I copy these numbers into Excel every Monday…"), but most of those ideas are never written down. When they are, they're too vague to act on. This project tries to fix both problems:

1. **Make submitting feel welcoming.** The landing page congratulates people for spotting a problem and invites them in. It also points anyone unsure to a GitHub contact.
2. **Let AI do the requirements-gathering.** Most people don't know what a "supplier" or an "output" is in process terms, and they shouldn't need to. An AI interviewer asks plain questions one at a time and turns the answers into a structured summary: problem, testable requirements, and a SIPOC map (Suppliers, Inputs, Process, Outputs, Customers).
3. **Keep it visible.** Every idea gets an ID and a status that the submitter, and anyone else, can follow on the board.

## How it was designed

The project was planned and built in a conversation with Claude (in Claude Code). Several first ideas didn't survive contact with reality, and the reasons explain the final design.

| Step | What we considered | What we found | Decision |
|---|---|---|---|
| 1 | Embed a Gemini Gem in the page | Gems can't be embedded or called through an API. Gemini blocks being shown inside other sites. | Drop embedding |
| 2 | Call the Gemini or Claude API from the page | An API key in a static page is visible to everyone. Hiding it needs a backend, such as a Google Apps Script proxy. The Claude API also has no free tier. | Rejected: this is a showcase project with no keys and no running costs |
| 3 | Write to the Google Sheet directly | A static site can't write to a Sheet without a login or a backend | Use a **Google Form** as the way data gets in, and read the linked Sheet back |
| 4 | Fully in-browser AI (Puter.js, Chrome's built-in Gemini Nano) | Puter makes users sign up for another service. Chrome's built-in model is limited and only available in some browsers. | Rejected |
| 5 | Open a shared Gem in a pop-up and paste its summary back | Works without keys. A fixed summary format makes the paste reliable. | Adopted the **copy-and-paste** approach |
| 6 | Share the Gem with users | Google is replacing Gems with **skills** (October 2026), and sharing for skills wasn't available. Rather than depend on one assistant, the site supports several. | **Bring your own AI:** the site hands the interview prompt to ChatGPT, Claude, Copilot or any assistant |
| 7 | Add Gemini back | A shared Gem with the same instructions was created and works by link | **Open in Gemini** opens the shared Gem directly, next to the other assistants |

The result is that the AI conversation happens in whatever assistant the person already uses. That also helps at companies that allow only one AI tool. The site's job is to start the interview and to read its output reliably.

### Visual design

The design deliberately avoids the soft, rounded "AI-generated website" look. It's styled like a **shop-floor work order**:

- a paper grid background with thick ink borders and hard offset shadows;
- a safety-yellow accent and hazard-tape dividers;
- a wide, heavy headline font (Archivo) with monospace labels (IBM Plex Mono);
- idea IDs shown like ticket numbers, and statuses shown as rubber stamps.

It follows the visitor's light or dark setting and works at phone width.

---

## How it works

```
                        ┌──────────────────────────┐
  submit.html ──POST──► │ Google Form (anonymous)  │
                        └────────────┬─────────────┘
                                     │ writes a row
                                     ▼
  index.html  ◄──read── ┌──────────────────────────┐ ◄── you edit the
  request.html          │ Google Sheet, tab "Ideas"│     Status column
                        └──────────────────────────┘
```

### Submitting an idea

1. **Name.** The user enters their first name and surname.
2. **Interview.** "Open in ChatGPT" and "Open in Claude" are links with the whole interview prompt in the URL (`chatgpt.com/?q=…`, `claude.ai/new?q=…`), so the chat starts immediately. "Open in Gemini" opens a shared Gemini Gem that already holds the interview instructions; the user types "Hi" to start. "Copy interview prompt" covers Copilot and any other assistant.
3. **Paste.** The AI ends the interview with a block in a fixed format:
   ```
   === IDEA SUMMARY ===
   Title: …
   Problem: …
   Requirements:
   - The automation should …
   Suppliers: …
   Inputs: …
   Process:
   1. …
   Outputs: …
   Customers: …
   Frequency & time spent: …
   === END ===
   ```
   The parser in `submit.js` finds the block, reads each label (including text that continues over several lines), and fills in the form. It tolerates what chat apps add when copying: code fences, `**bold**` labels, bullet markers, and text before or after the block. "Not specified" becomes an empty field.
4. **Review.** Every field can be edited, and the SIPOC map is shown as five columns. People can skip the AI entirely and type into these fields directly.
5. **Submit.** The browser generates an ID such as `IDEA-7K3QF`, avoiding IDs already on the board, and POSTs the fields to the form's `formResponse` endpoint.

Google Forms doesn't send CORS headers, so the request uses `mode: 'no-cors'` and the response can't be read. A successful fetch means the request was sent, not that Google confirmed it. To cover the gap, the idea is also saved in the browser's `localStorage`, and the user goes straight to `request.html?id=…&new=1`. Until the sheet catches up, the idea shows a "Syncing" status.

A hidden honeypot field catches simple spam bots. If it's filled in, nothing is sent.

### Reading the board

The sheet is shared as **Anyone with the link → Viewer**, which lets the page query it through Google's visualization endpoint:

```
https://docs.google.com/spreadsheets/d/<sheetId>/gviz/tq?tqx=out:json&headers=1&sheet=Ideas
```

The response is JSON wrapped in a JavaScript callback, and Google sends CORS headers for public sheets, so a plain `fetch` works. Columns are matched by **header name**, not position, so reordering the columns doesn't break the site. Timestamps arrive as `Date(y,m,d,h,m,s)` and are converted without guessing the date format. Ideas from this browser that aren't in the sheet yet are merged in, and the "Mine" filter uses those IDs.

### Managing ideas

The **Ideas** tab has a **Status** column with a dropdown: New, Under review, In progress, Done, Declined. A blank status is shown as "New". Changes appear on the site on the next page load.

### Security notes

- Everything rendered from the sheet goes through a small `h()` helper that uses `textContent` only, so submitted text can't inject HTML or scripts.
- The repository contains no secrets. The sheet ID and form entry IDs in `config.js` are public by design.
- **All submissions are public**, including names, because the sheet must be readable by anyone. The site says so on the submit page and in the footer.

---

## Project structure

```
index.html                 Landing page and idea board
submit.html                Four-step submission flow
request.html               Single idea details (?id=IDEA-XXXXX)
assets/css/style.css       Design tokens, light/dark themes, layout
assets/js/config.js        Sheet ID, form endpoint, entry IDs, GitHub user
assets/js/data.js          Sheet reading, local storage, submission, DOM helpers
assets/js/prompt.js        The interview prompt given to the AI
assets/js/index.js         Board rendering, search and filters
assets/js/submit.js        AI launchers, summary parser, validation, submit
assets/js/request.js       Detail page rendering
setup/create-form.gs       One-time Apps Script that created and linked the Form
setup/automation-idea-coach/SKILL.md   Gemini skill version of the interviewer
```

Plain HTML, CSS and ES modules, with no build step and no dependencies apart from Google Fonts.

## Running and deploying

**Locally:** run `python3 -m http.server` in the project folder and open http://localhost:8000. A plain `file://` page can't load the ES modules.

**GitHub Pages:**
1. Make the repository public (free Pages requires a public repo).
2. Go to Settings → Pages → Deploy from a branch → `main` / `(root)`.
3. The site appears at `https://aidasdem-design.github.io/Idea-platform-with-Gemini-gem-integration/`.

## Setting it up from scratch

1. Run `setup/create-form.gs` once at [script.google.com](https://script.google.com). It creates the form, links it to the sheet, adds the Status dropdown, and logs the form endpoint and entry IDs.
2. Rename the responses tab to `Ideas`, and share the sheet as Anyone with the link → Viewer.
3. In the form's settings, make sure responses aren't restricted to your organization.
4. Copy the logged values into `assets/js/config.js`.

## Changing the interview

The interview exists in three places, and **the summary labels must stay identical in all of them**, because the paste parser depends on them:

- `assets/js/prompt.js`: the prompt used for ChatGPT, Claude and "Copy interview prompt"
- the shared Gemini Gem, set up from `setup/gem-instructions.md` and linked through `geminiGemUrl` in `config.js`
- `setup/automation-idea-coach/SKILL.md`: the Gemini skill version, for when Gems become skills

Editing the Gem's instructions on Gemini doesn't change its share link. If `geminiGemUrl` is emptied, "Open in Gemini" falls back to copying the prompt and opening a blank Gemini chat.

## Known limitations

- Submissions can't be confirmed by Google (`no-cors`). The local copy and "Syncing" status cover the delay.
- No login: "Mine" means "submitted from this browser".
- Very long prompts in the ChatGPT and Claude links could be cut off by those services. "Copy interview prompt" always works.
- The board loads the whole sheet. That's fine for hundreds of ideas, but not tens of thousands.

## Roadmap

- When Google converts the Gem into a skill (from November 2026), check that the share link still works and update `geminiGemUrl` if it changes
- Optional email or GitHub notification when an idea's status changes
