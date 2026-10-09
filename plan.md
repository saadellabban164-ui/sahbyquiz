# صاحبي عارفني؟ — Implementation Plan

## Product approach
A static-first, mobile-first social quiz app hosted on GitHub Pages, with Firebase Auth/Firestore/Cloud Functions as the production data layer. The frontend is plain HTML, CSS, and vanilla JavaScript so it remains fast, portable, and easy to deploy. Anonymous Firebase authentication is used to mint owner identities; creator tokens are never placed in public quiz documents. When Firebase is not configured, the interface displays a clear setup state rather than pretending data is live.

## Design system
- **Design movement:** editorial neo-brutalism softened with Cairo street-poster energy.
- **Core principles:** bold hierarchy, generous touch targets, playful but grown-up interactions, and honest system states.
- **Color philosophy:** ink navy anchors trust; mango gold creates warmth and movement; mint and coral give each quiz a distinct social pulse without childish rainbow styling.
- **Layout paradigm:** offset editorial bands and stacked cards, with a left-side progress rail on wide screens and a compact top rail on phones.
- **Signature elements:** a notched VSOS badge, angled accent bars, and answer cards that lift on selection.
- **Interaction philosophy:** every action gives immediate feedback; progress and privacy state are always visible.
- **Animation:** 180–360ms ease-out transitions, staggered card entry, reduced-motion support, and no looping distractions.
- **Typography:** Cairo for Arabic display/body, Inter for English metadata and controls; heavy display headlines and relaxed 1.65 line-height for Arabic.
- **Brand essence:** a private, playful quiz room for friends who want to turn inside jokes into a shareable moment. Warm, cheeky, dependable.
- **Brand voice:** direct Egyptian Arabic, never corporate. “خلّي صاحبك يثبت إنه فاهمك” and “الإجابة دي كانت هتفضحك شوية”.
- **Wordmark:** the Arabic title sits inside a rounded ticket shape with a small slash mark, paired with a compact VSOS block.
- **Signature color:** Mango Gold `#F4B942`.

## Project structure
- `index.html` — semantic shell, SEO metadata, panels and dialogs.
- `styles.css` — responsive design system, light/dark themes, motion, print/card styles.
- `app.js` — routing, question library, creator flow, friend flow, results, leaderboard, Firebase adapter, PNG export.
- `firebase-config.example.js` — browser-safe Firebase config template.
- `firestore.rules` — owner-private quiz/submission rules and public leaderboard reads.
- `functions/` — optional trusted scoring/leaderboard Cloud Functions for production hardening.
- `public/manus-routes.json` — route manifest for the managed preview.
- `README.md` — Firebase setup, deployment, security, and test journey.

## Data model
- `quizzes/{quizId}`: public quiz metadata/questions plus `ownerUid`; never stores creator answers.
- `quizPrivate/{quizId}`: owner-only answer key and ownerUid.
- `submissions/{submissionId}`: creator-only full response; public result projection contains only the submitter’s own result.
- `leaderboards/{quizId}/entries/{entryId}`: public display name, score, percentage, timestamp; no private answers.
- Cloud Functions validate ownership and compute score server-side when enabled.

## Delivery constraint
GitHub Pages serves the frontend. Firebase is the persistent backend. The UI includes a first-run configuration check and will not claim that cross-device persistence is active until a real Firebase config is provided.
