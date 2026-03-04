# Implementation Notes

## Android signing secrets

- Release signing credentials were removed from tracked files.
- Define the following in your local untracked Gradle properties (for example `~/.gradle/gradle.properties`) or in CI secrets:
  - `MYAPP_RELEASE_STORE_FILE`
  - `MYAPP_RELEASE_STORE_PASSWORD`
  - `MYAPP_RELEASE_KEY_ALIAS`
  - `MYAPP_RELEASE_KEY_PASSWORD`
- A template is available at `android/gradle.properties.example`.
- Release CI workflow: `.github/workflows/android-release.yml`.
- Step-by-step checklist: `docs/release-hardening-checklist.md`.

## Firebase rules

- Firestore rules are now versioned in `firestore.rules`.
- Storage rules are now versioned in `storage.rules`.
- `firebase.json` references both rulesets.

## Feature flags (`config/app`)

The app now supports these remote flags:

- `favoritesEnabled` (default true)
- `customAlertsEnabled` (default true)
- `dataReportsEnabled` (default true)
- `newAdminCrudEnabled` (default true)
- `otaGitEnabled` (default true)

These are managed from Admin Home Config.

## Push token preferences (`fcmTokens/{token}`)

Each token document now stores:

- `notificationsEnabled`
- `channels.updates`
- `channels.turno`
- `channels.promo`
- `userId`, `platform`, `appVersion`, `updatedAt`

Cloud Functions now filter outgoing notifications based on these preferences.
