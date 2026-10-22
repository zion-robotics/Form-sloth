# FormSloth — Fill once. Reuse everywhere.

FormSloth is a Chrome extension for reducing repetitive form filling, especially
for hackathons, scholarships, events, and applications.

## The problem

Many applications ask the same basic questions repeatedly: name, email,
school, location, links, team details, and short background information.
Re-entering those answers takes time and makes it easier to introduce
inconsistent or accidental typos. FormSloth lets you save answers once and
reuse them on compatible web forms.

## Features

The current extension includes:

- A browser-local profile with reusable answers for common questions.
- A profile page opened through the extension's **Edit my profile** button.
- A built-in question bank covering identity, contact, education, work,
  portfolio links, hackathon details, and several longer-answer prompts.
- Matching based on visible field labels and related accessible metadata,
  including `aria-label`, `aria-labelledby`, placeholders, and field names.
- Filling of supported empty text inputs, textareas, and select controls.
- Support for forms inside frames where Chrome permits script injection.
- A report showing how many fields were filled, fields that need profile
  answers, and questions not found in the bank.
- Protection against overwriting non-empty fields.
- Visual marking of fields filled by FormSloth.

The popup also contains an in-progress Gemma/Ollama drafting path. It is not
documented as a complete or generally supported feature; Gemma integration is
planned and remains unfinished.

## How it works

### 1. Set up a profile

Open the extension popup and choose **Edit my profile**. Enter answers for the
fields you want to reuse, then choose **Save**. Leave an answer empty when you
do not want FormSloth to fill that item.

The built-in bank can be extended by saved entries, although the current UI
does not provide a separate editor for creating those additional entries.

### 2. Match questions

Choose **Fill this form** on the page you want to complete. FormSloth scans
visible, enabled, editable `input`, `textarea`, and `select` elements. It
builds a label from available page metadata and compares normalized text
against phrases in the question bank.

The longest matching phrase wins. For a select control, FormSloth chooses an
option whose visible text overlaps with the saved answer. If no match is
available, or a matching profile answer is empty, the field is reported rather
than guessed.

### 3. Fill the form

FormSloth writes matching answers into empty supported fields and dispatches
input and change events so pages can observe the update. It does not replace
values that are already present. Filled fields receive a green outline while
the popup displays a summary of the result.

## Installation

FormSloth is currently distributed as unpacked extension source.

### Chrome

1. Download or clone this repository.
2. Open `chrome://extensions`.
3. Turn on **Developer mode**.
4. Select **Load unpacked**.
5. Choose the repository folder containing `manifest.json`.
6. Pin FormSloth if you want it readily available in the toolbar.

### Microsoft Edge

1. Download or clone this repository.
2. Open `edge://extensions`.
3. Turn on **Developer mode**.
4. Select **Load unpacked**.
5. Choose the repository folder containing `manifest.json`.
6. Pin FormSloth if you want it readily available in the toolbar.

After changing extension files, return to the extensions page and use the
extension's **Reload** control.

## Configuration and use

1. Load the extension and open its popup.
2. Select **Edit my profile**.
3. Complete only the profile fields you are comfortable storing in the
   browser's extension storage.
4. Select **Save**.
5. Open a compatible form and select **Fill this form**.
6. Review the filled values and any fields reported as unmatched or missing
   profile answers before submitting the form.

FormSloth is designed as an assistive filler, not an automatic submission
tool. You remain responsible for checking every value and submitting the form
yourself.

## Privacy and safety

- Profile answers are saved with `chrome.storage.local`, under the `bank` key.
  The extension does not include an account system or a sync service.
- The profile page advises users not to store passwords, card numbers, or ID
  numbers.
- The filler skips password, hidden, file, checkbox, radio, submit, button,
  image, and reset inputs. It also skips fields whose label or autocomplete
  metadata matches patterns for passwords, passcodes, card numbers, CVV/CVC,
  SSNs, passports, national IDs, NIN, BVN, PIN, or OTP.
- Empty fields with no matching bank entry are not guessed. Existing non-empty
  values are not overwritten.
- The manifest grants `activeTab`, `scripting`, and `storage` permissions.
  Host permissions are limited to `http://127.0.0.1/*` and
  `http://localhost/*`. Chrome may still restrict injection on browser
  internal pages and Web Store pages.
- The current code contains a draft-only request path to a local Ollama
  endpoint at `http://127.0.0.1:11434/api/chat`, using the `gemma3:1b` model.
  That path is unfinished and is not a completed FormSloth feature. If it is
  enabled or used in a development build, profile answers and a form question
  may be sent to that local service. The repository contains no code that sends
  profile data to a FormSloth-hosted service.
- These checks are pattern-based, not a guarantee that every sensitive field is
  recognized. Users should never store highly sensitive information in the
  profile and should review fields before submitting.
- The extension does not validate whether an answer is correct for a particular
  form, and page scripts can have their own behavior when fields are changed.

## Current limitations and future plans

Current limitations include:

- Matching depends on the wording and metadata exposed by a page; unusual or
  dynamically rendered forms may not match.
- The bank has fixed built-in entries, and the profile UI is focused on editing
  answers rather than managing matching phrases.
- Select matching is based on text overlap and may not choose an option for
  every form.
- Some controls are intentionally skipped, including file uploads, choices,
  password-like fields, and other sensitive-looking fields.
- Browser restrictions can prevent FormSloth from running on some pages.
- There is no form submission, answer validation, account, or cloud sync
  feature.
- Gemma/Ollama drafting is planned but not complete.

Possible future work includes improving matching and field-type support,
providing safer and clearer profile management, adding more transparent
review controls, and completing the optional local drafting workflow without
turning it into an automatic submission system.

## Project structure

```text
.
├── manifest.json       # Chrome extension manifest and permissions
├── bank.js             # Default question bank and saved-bank merging
├── popup.html          # Toolbar popup UI
├── popup.js            # Form scanning, matching, filling, and popup actions
├── options.html        # Profile editor UI
├── options.js          # Profile loading and saving
└── .github/
    └── workflows/
        └── ci.yml      # JavaScript syntax, manifest, and archive checks
```

## Contributing

1. Fork the repository and create a focused branch.
2. Make a small, user-visible change without committing secrets or personal
   profile data.
3. Test the extension by loading it unpacked in Chrome or Edge and trying it
   on representative forms. Review every filled value manually.
4. Run the repository's available checks before opening a pull request:

   ```bash
   find . -name "*.js" -print0 | xargs -0 -r -n1 node --check
   node -e "JSON.parse(require('node:fs').readFileSync('manifest.json', 'utf8'));"
   ```

5. Describe the behavior change, limitations, and manual testing performed in
   the pull request.

Please keep changes narrowly scoped and update the documentation when
user-facing behavior changes.
