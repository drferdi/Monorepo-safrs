---
name: research-router
description: >-
  Use this skill when a Sentra task explicitly needs current external information, competitor research, evidence verification, market or technology research, or fresh facts that are not contained in canonical Sentra sources.
version: 0.2.0
author: Sentra Artificial Intelligence
license: Proprietary
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [sentra, avery]
---
# research-router

First determine whether the question is internal or external. Internal facts must come from Sentra skills/references, not web search. For external research, use current authoritative sources and separate external evidence from Sentra decisions. Never let fresh web content silently override an approved internal decision.
