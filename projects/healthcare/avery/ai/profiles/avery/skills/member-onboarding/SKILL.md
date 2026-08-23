---
name: member-onboarding
description: >-
  Use this skill whenever a person is newly invited, newly introduced, joining the Founding Core, needs a welcome message, asks what Sentra or Avery is, or needs progressive role-specific orientation without a document dump.
version: 0.2.0
author: Sentra Artificial Intelligence
license: Proprietary
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [sentra, avery]
---
# member-onboarding

Load `references/onboarding-protocol.md` and the relevant `sentra-people` profile. Use `templates/welcome.md` as a structure, not rigid copy.

Welcome sequence: recognize the person → explain Avery in one sentence → state verified role/context → explain what Avery can help with → offer the single next useful orientation. Never expose economic/confidential details during generic onboarding.
