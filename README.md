# SkillBridge

AI-powered academia–industry collaboration, implemented as a React + TypeScript + Vite application with Firebase deployment scaffolding.

## Current MVP scope

The frontend runs in **local demo mode** without cloud credentials. Firebase mode adds a signed-in network directory with college/company offerings, student connection requests, organization approvals, an AI-generated resume assessment, role-specific mock tests, scored results, and in-platform offer letters. The AI assessment accepts pasted resume text and saves scores and strengths to the student's private profile; an approved organization can view that profile and send a mock test with a 70%, 75%, or 80% pass threshold. Offer letters can only be sent after a student passes. Local demo accounts cannot call these secured Firebase workflows.

Browser-local demo accounts are not authentication and do not provide production security. The resume assessment requires the student to paste resume text; it does not upload or parse PDF/DOCX files. AI scores are practice feedback and should not be treated as an objective hiring decision. Organization accounts do not require platform-admin approval; students request connections and the organization decides.

## Requirements

- Node.js 20 or newer
- npm

## Run locally

```sh
npm install
npm run dev
```

Open the Vite URL printed in the terminal. Firebase-backed accounts and profile data persist in Firestore; when Firebase is not configured, the app falls back to browser-local demo data under `skillbridge-demo-v1`.

## Firebase web app setup

The web client reads Firebase's public web configuration from `.env.local` (already populated for the `skillbridge-sh` web app in this workspace). Before using cloud accounts:

1. In Firebase Console, enable **Authentication → Email/Password** and **Google**, and create a **Cloud Firestore** database.
2. Run `firebase login`, then deploy the Firestore rules with `firebase deploy --only firestore:rules --project skillbridge-sh`.
3. Restart the Vite dev server after changing `.env.local`.

Registration and sign-in use Firebase Authentication. Google and email/password methods can be linked under **Settings** so the same Firebase UID and profile are used for both. User profile fields are stored in `users/{uid}`; skills, resume filename, and application IDs are stored in the account's private `userData/{uid}` document. Assessment summaries are stored in `studentProfiles/{uid}` and visible to an organization only after an approved connection. Colleges and companies publish their offerings in the network directory. The Admin demo button remains a local preview and does not create a privileged Firebase admin account.

## Validate / build

```sh
npm run typecheck
npm run build
```

## Configure Firebase (separate project)

1. Create a new Firebase project specifically for SkillBridge; do not reuse a production project.
2. Register a web app and copy its public web configuration into a local `.env` based on `.env.example`. These values are public identifiers, not service-account credentials.
3. Enable Email/Password in Firebase Authentication; create Firestore and Storage.
4. Install Firebase CLI and run `firebase login`. The repository's Firebase project alias points to `skillbridge-sh`.
5. Review and deploy rules/indexes with `firebase deploy --only firestore:rules,firestore:indexes,storage --project skillbridge-sh`.
6. Install function dependencies with `cd functions && npm install`. Configure the server-side AI key with `firebase functions:secrets:set OPENAI_API_KEY`, then build and deploy with `cd functions && npm run build` and `firebase deploy --only functions`.
7. Never expose the OpenAI key or Admin SDK credentials in the browser. Organization approvals are limited to their own student connection requests by Firestore rules and callable-function checks.
8. Run local services using `firebase emulators:start` after Firebase CLI setup. Configure the frontend Auth, Firestore, and Storage SDK clients and emulator connections before expecting persistence outside demo mode.
9. Deploy the frontend with `npm install && npm run build && firebase deploy --only hosting`.

## AI configuration

The server-only `generateCareerAssessment` and `generateOrganizationMockTest` callable functions use the OpenAI Chat Completions API with strict JSON Schema output. Set the `OPENAI_API_KEY` Firebase Functions secret before deploying; the app never receives the provider key. The resume is limited to 20,000 characters and is sent to OpenAI for assessment. The AI prompt treats resume content as untrusted input, and answer keys stay server-side. The Functions use `gpt-4o-mini` for structured results supported by the [official Structured Outputs guide](https://developers.openai.com/api/docs/guides/structured-outputs).

## Data and security notes

`firestore.rules`, `storage.rules`, and `firestore.indexes.json` are a starting policy set. Firebase Admin SDK bypasses these rules, so each privileged function checks identity, ownership, and request validity itself. Students request connections; the college or company named in each request approves or declines it. Organizations do not need platform-admin approval. Callable functions keep answer keys server-side, score assessments and mock tests, and allow an organization to issue an offer only after a passing result. Review the policies and run Firebase Emulator security tests before production use. This MVP processes pasted resume text; it does not upload or parse resume files, verify credentials, email offer letters, or provide legally binding contract signatures.

## Project structure

- `src/` React app and responsive design system
- `functions/` Cloud Functions TypeScript starter
- `firestore.rules`, `storage.rules`, `firestore.indexes.json` Firebase policy scaffolding
- `.env.example` public frontend config placeholders
# Shared AI API key management

The dashboard's **API Keys** page is available in the Admin demo workspace, but the demo identity is browser-only and cannot write shared credentials. The server allowlist currently authorizes only the verified Firebase Auth email `shfoundationsltd@gmail.com` to rotate keys. The website checks this permission with a callable function and shows the API Keys page for that account. Other users and the Admin demo are denied by the server.

Deploy the Firebase Functions and Firestore rules to activate this access on the hosted site. A key entered in **API Keys** is saved in the server-only `privateSettings/apiKeys` Firestore document; Firestore rules deny all client access. AI assessment functions read the managed key on the server and fall back to the `OPENAI_API_KEY` Functions secret when no managed key has been saved. The UI can only read connection status and never receives the stored key.

Firestore encrypts stored data at rest using Google-managed encryption. For environments requiring customer-managed encryption keys or provider-level secret rotation, use Secret Manager with an appropriately restricted service account instead.
