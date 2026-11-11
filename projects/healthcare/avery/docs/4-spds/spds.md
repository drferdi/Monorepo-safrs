---
document_id: "SPDS"
title: "Sentra Project Documentation Standard 1.0"
status: active
authority: Chief
owner: dr. Ferdi Iskandar
version: "1.0.0"
created: "2026-08-25"
last_verified: "2026-08-25"
applies_to: projects/healthcare/avery
source_of_truth: true
supersedes: []
related_requirements: []
related_decisions: []
related_evidence: []
agent_readable: true
agent_editable: false
human_approval_required: true
classification: SENTRA
review_trigger: material change to purpose, architecture, runtime, or evidence
---

# Sentra Project Documentation Standard (SPDS) 1.0 — 2026

**Status:** Adopted for Avery as the first Sentra project instance (Chief-directed).  
**Positioning:** SPDS is a purpose-oriented, evidence-bearing, human-authoritative documentation architecture for modern software, systems, AI, and agentic projects.

## Philosophy

Documentation is not an archive. It is:

**Purpose → Decision → Requirement → Implementation → Evidence → Outcome**

A project must make it possible for a human or an AI agent to understand why it exists, what success is, who decides, what was decided, what is true now, what is unknown, what must be built, how to prove it, which risks are accepted, and how it changed.

## Core rule

Every document must AUTHORIZE, DEFINE, DECIDE, GUIDE, VERIFY, or PRESERVE. If it does none, it is bureaucracy.

## Difference from traditional docs

Traditional: which documents did we produce?  
SPDS: what must be true, who decided it, why is it true, what exists now, where is the evidence?

Traditional traceability: Requirement → Test.  
SPDS: Purpose → Decision → Requirement → Architecture → Implementation → Evidence → Outcome.

Traditional AI governance: policy + model card.  
SPDS agent governance: Human Authority → Autonomy Envelope → Action → Evidence → Accountability.

## Metadata

Authoritative documents use the YAML header in this directory.

## This instance

Avery's filled documents live alongside this file. The machine root is `../../PROJECT_GENOME.yaml`.

Core principle: Purpose before process. Authority before autonomy. Evidence before assertion. Current state before history. Outcomes before activity.
