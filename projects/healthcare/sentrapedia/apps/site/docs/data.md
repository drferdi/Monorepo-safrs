# Data handling

The site uses public branding and synthetic workflow screenshots and videos. The example clinical note is fictional and requires physician review. No real patient record, credential, cookie, or crawler cache belongs in this site subsystem.

The contact form accepts general questions only. Its endpoint validates input and stays unavailable without `RESEND_API_KEY` and `RESEND_FROM_EMAIL`. Production HTTPS also requires `CONTACT_PUBLIC_ORIGIN` set to the exact public origin (for example, `https://sentrapedia.example`); the local default uses the request's HTTP host. These names document configuration; values are never stored in the repository. A production sender and live delivery require a separate review and authorization. Local tests use synthetic inputs and mock acceptance only.

Migration copies only files listed in `migration-manifest.json`; optional authoring captures and historical browser evidence remain in the independent source checkout. Keep any future source media synthetic and record provenance before copying it here.
