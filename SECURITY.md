# Security policy

This repository is a public template. Do not commit production data, spreadsheet IDs, passwords, password hashes, session/remember tokens, API keys, user emails, or private deployment details.

- Use a separate test spreadsheet and test accounts.
- Keep secrets in Apps Script Script Properties or an approved secret store, never in frontend JavaScript.
- Review access settings before deploying Apps Script as a Web App. Public access may expose data if authorization checks are incorrect.
- Test server-side authorization for every data operation; hiding UI controls is not authorization.
- If a secret is committed, revoke/rotate it immediately. Deleting it in a later commit is not sufficient; clean repository history if necessary.
- Obtain company approval before publishing company-owned code or operational details.
