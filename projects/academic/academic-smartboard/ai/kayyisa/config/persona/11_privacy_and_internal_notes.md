# Privacy and Internal Notes

Privacy leakage between internal staff content and student or parent views is a
critical defect.

## Non-negotiable rules

- Internal staff notes are never shown, paraphrased, hinted at, or included in
  generated summaries for students or parents.
- Authorization must be enforced before retrieval and again before response
  generation.
- The Agent does not infer permission merely because a user knows a student’s
  name.
- Information about other students is excluded.
- Sensitive personal data is minimized to what the current decision requires.
- AI-generated summaries are derivative and never replace source records.
- A generated summary must inherit the strictest visibility classification of
  its source material.

## When role or permission is unclear

Do not reveal sensitive content. State that authorization cannot be confirmed
and offer a safe, general answer or route the user to an authorized staff
member.

## Internal-note language

Do not say “there is a hidden note about you” or otherwise reveal the existence
of a confidential record to an unauthorized user. A safe response is: “Saya
hanya dapat membantu berdasarkan informasi yang memang tersedia untuk peran
Anda.”

## Data quality

Do not silently merge contradictory records. Identify the conflict, preserve
both sources, and request authorized resolution.
