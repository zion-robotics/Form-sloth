# FormSloth

A browser extension that fills repetitive forms from answers you write once. A small local Gemma model drafts replies to questions it has not seen before. Nothing leaves your machine.

Built for the DEV Hacktoberfest Open-Source AI Challenge, Week 3 (Slow and Steady).

## The problem

Hackathon sign-ups, scholarship forms and event registrations all ask the same things: name, email, school, GitHub, why do you want to join. Browser autofill handles the short fields. It does nothing for the open questions, and those are the ones people copy and paste from an old document every time.

## How it works

1. You write your answers once on the profile page. The extension ships with about thirty common questions, each with a list of label phrases that should trigger it (for example "where are you from" and "country of residence" both map to Country).
2. On a form, click **Fill this form**. Each field's label is matched against the bank and filled with your saved answer. No AI is involved in this step, so it is instant. Filled fields get a solid green outline.
3. Questions the bank does not recognize that look like real questions get a **Draft with Gemma** button. Your saved profile and the question go to a model running in Ollama on your own computer, and the reply is written into the field with a dashed orange outline.
4. You read the orange fields, edit them, and submit. Drafts are suggestions, not final answers.

## What it never touches

- Password, card, ID-number and similar fields
- Checkboxes and radio buttons, so consent boxes are always yours to tick
- Address, date and signature fields (they are not sent to the model either)
- Any field that already has text in it

## Install

You need Chrome or Edge, and Ollama.

1. Install Ollama from ollama.com and pull a model:
   ```
   ollama pull gemma3:1b
   ```
2. Let Ollama accept requests from browser extensions. On Windows:
   ```
   setx OLLAMA_ORIGINS "chrome-extension://*"
   ```
   Then quit Ollama from the system tray and start it again. You can check it with:
   ```
   curl.exe -i http://127.0.0.1:11434/api/tags -H "Origin: chrome-extension://test"
   ```
   The first line should say `200 OK`.
3. Clone or download this repo.
4. Open `chrome://extensions`, turn on Developer mode, click **Load unpacked**, and select the folder that contains `manifest.json`.
5. Click the extension, choose **Edit my profile**, fill in your answers and save.

## Choosing a model

The model name is the `MODEL` constant at the top of `popup.js`. I used `gemma3:1b` because the machine I built this on has 4GB of RAM, and a larger Gemma would not fit comfortably. If you have more memory, a bigger Gemma should write better drafts. Change the constant and pull the model with Ollama. I have not tested other sizes.

## Privacy

- Your profile is stored in the browser's local extension storage.
- The only network request the extension makes is to Ollama at `127.0.0.1:11434` on your own machine.
- No account, no server and no API key.

## Known limitations

- **Drafting is slow without a GPU.** On a 4GB laptop with no GPU, drafting a handful of answers took minutes, not seconds. Keep the popup open until it finishes, because clicking on the page closes it and cancels the request.
- **Small models embellish.** In testing, the 1B model mostly reused sentences from the profile, but it also added a phrase I never wrote and, in one case, claimed a favorite tool when my profile only listed it as a skill. The prompt now tells it not to state preferences, but a small model will not always obey. Read every orange field.
- **Radio buttons and checkboxes are skipped.** A Yes/No question such as "Have you participated in a hackathon?" is left for you to answer.
- **Matching is phrase based.** A field is matched when its label contains a known phrase as whole words. Unusual wording will land in the "Not in the bank yet" list, and you can add phrases to `bank.js`.
- **Tested on a small number of forms.** So far this means a JotForm registration page and a Google Form. Other form builders may label fields differently.
- **Chrome and Edge only**, and it cannot run on browser-internal pages or the Chrome Web Store.

## Project layout

```
manifest.json   extension manifest (Manifest V3)
bank.js         the question bank and the merge logic
popup.html      the popup
popup.js        field matching, filling and the Ollama call
options.html    profile page
options.js      profile page logic
.github/        CI workflow
```

## Development notes

The CI workflow, the first expansion of the question bank, and parts of the code were produced with GitHub Copilot's coding agent and Claude. I reviewed and merged the pull requests myself and tested the extension on real forms.

CI runs on every push and pull request. It syntax-checks each JavaScript file, validates `manifest.json`, and uploads a zip of the extension as a build artifact.
