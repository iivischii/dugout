# Firebase setup for The Dugout

The Firebase Web SDK is configured for `the-dugout-a5d24`. Analytics is not enabled; it is not needed for accounts or saves.

## Enable the services

1. In Firebase Console, open **Build → Authentication → Get started**. Enable the **Email/Password** sign-in provider.
2. Open **Build → Firestore Database → Create database**. Use the **Standard** edition and **Production mode**. Choose the region you want to keep your data in.
3. In Firestore's **Rules** tab, replace the initial rules with the contents of `firestore.rules`, then **Publish**. These rules allow each account to access only its own career and completed matches. Everything else is denied.
4. In Authentication settings, check **Authorized domains**. Add `localhost` if it is missing for local development. Add your actual hosting domain when you deploy.

The web configuration provided in chat identifies the Firebase project. Access protection comes from Authentication and the published Firestore rules, not from hiding the web API key. Never put an Admin SDK service-account key into this React project.

No database rules or authentication settings have been deployed remotely by this change. There are no custom user roles or admin permissions.

## How to use it

- Open **Account / Cloud saves** on the opening screen, or **Account** at the bottom of the sidebar.
- Create an account with email/password or sign in to an existing account.
- **Save browser career to cloud** uploads the manager name and completed matches. Existing cloud match IDs are retained. A different established manager name cannot replace the account's manager.
- After the save promise resolves, a green **Career saved successfully** banner shows your completed-match count. **Done · return to game** closes Account. Pending and failed saves do not show this banner or close the panel automatically.
- **Load cloud career** downloads the account's career. If the manager names match, it combines histories without duplicate match IDs. If names differ, it loads the cloud career without mixing in the other manager's matches.
- Before loading, the previous browser career is backed up under `dugout-career-v1-backup-<timestamp>` in localStorage.
- Loading is disabled while a match is in progress. Finish that match first.
- **Sign out** calls Firebase sign-out. The local browser career remains on the device.

Cloud saving is manual in this first version. Saves include the manager and completed match timelines/decisions. Squad selections, custom database players, formation selection before kickoff, and an in-progress match are not cloud-saved yet. The CSV remains local. Read-only profiles are unchanged.

## Data structure

- `careers/{uid}`: the account's established `managerName`.
- `careers/{uid}/matches/{matchId}`: one completed match, using its existing ID to avoid duplicates.

Completed match records and manager names cannot be rewritten through the client rules. This is private save storage, not an anti-cheat system: matches still run in the browser. There are no leaderboards or server-verified results.

## Verification

Run `npm test`, `npm run lint`, and `npm run build`. `tests/browser.mjs` checks existing gameplay and the account UI with a mocked authentication error. No real accounts are created by the browser tests.

After enabling the services and publishing rules, create your own test account, save a completed match, then sign in from another browser and load it. Verify that a second account cannot access the first account's documents using Firestore's Rules Playground. Live login, cloud writes, and deployed rule enforcement need verification against your configured Firebase project; a successful frontend build alone does not verify them.

Official references: [Email/password authentication](https://firebase.google.com/docs/auth/web/password-auth), [Firestore access rules](https://firebase.google.com/docs/firestore/security/get-started).
