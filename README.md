# صاحبي عارفني؟ — How Well Do You Know Me?

A bilingual, Arabic-first friends quiz platform by VSOS. The frontend is plain HTML/CSS/vanilla JavaScript and is designed to publish on GitHub Pages. The production data layer is Firebase Authentication (anonymous sign-in), Cloud Firestore, and a callable Cloud Function that scores answers server-side and writes a public leaderboard projection.

## What is included

The home page is Egyptian Arabic RTL by default with a live English switch, dark mode, category library, 105 built-in questions, custom questions, quiz creation, private creator answer keys, unique links plus a six-digit join code, friend answering flow, progress controls, review screen, scoring, answer comparison, result sharing, WhatsApp links, PNG result cards, and a creator dashboard. Creators see the six-digit code immediately after publishing; friends can enter the code from the homepage instead of opening a URL, and Firebase lookup resolves the code across devices. Public quiz documents intentionally omit creator answers. The Cloud Function is the only production scoring path; it reads the private answer key on the server and writes only the submitter's own result plus a non-sensitive leaderboard entry.

## Run locally

```bash
python3 -m http.server 3000
# open http://localhost:3000
```

The app has a browser-only fallback so the UI and complete journey can be exercised before Firebase is configured. That fallback is local to the current browser and is not a replacement for production Firebase persistence.

## Connect Firebase for real cross-device persistence

1. Create a Firebase project and enable **Authentication → Anonymous**.
2. Create a Firestore database in production mode.
3. Copy `firebase-config.example.js` to `firebase-config.js` and replace the browser-safe values from Firebase Console. Never place admin SDK credentials in this file.
4. Install the Firebase CLI and select the project:

```bash
npm install -g firebase-tools
firebase login
firebase use YOUR_PROJECT_ID
firebase deploy --only firestore:rules,functions
```

5. Publish the frontend after `firebase-config.js` is present. Because `firebase-config.js` contains only public client identifiers, it may be shipped to GitHub Pages; the Firestore rules and Cloud Function protect the private answer key and submissions.

## Data model and access control

`quizzes/{quizId}` contains the public title, creator display name, questions without answers, active state, and owner UID. `quizPrivate/{quizId}` contains the owner UID, owner token, and answer map and is owner-only. `submissions/{submissionId}` is written by the callable function and readable/deletable only by the owner. `leaderboards/{quizId}/entries/{entryId}` contains only a display name, score, percentage, and timestamp and is public-read. See `firestore.rules` and `functions/index.js`.

For a stronger production posture, enable Firebase App Check, add a custom email link or Google provider, and use Firebase Hosting or a Cloud Function endpoint if you need server-rendered social preview cards. GitHub Pages can still host this client application.

## GitHub Pages

This repository is a static site: keep the source files at the repository root, enable **Settings → Pages → Deploy from branch → main / root**, and the site will be available at `https://YOUR_GITHUB_USERNAME.github.io/REPOSITORY_NAME/`. The single-page app uses hash navigation, so it works without server rewrite rules.

## Test journey

1. Open the home page and choose **اعمل اختبارك**.
2. Enter a creator name, select at least five questions, enter private answers, and publish.
3. Copy the generated link, open it in a new private window, enter a friend name, answer every question, review, and submit.
4. Confirm the result percentage, answer comparison, WhatsApp link, PNG download, and leaderboard entry.
5. Return to the creator browser and open **لوحة التحكم** to see the quiz and local submissions. With Firebase configured, verify the owner-only dashboard query and Firestore documents.

## Brand

Footer attribution: **Created by VSOS**. Replace the placeholder VSOS link in `index.html` with the official destination before launch.
