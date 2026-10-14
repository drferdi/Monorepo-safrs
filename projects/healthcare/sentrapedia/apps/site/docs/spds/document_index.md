---
document_id: "00"
title: "Document Index"
status: active
authority: Gaffer
owner: "dr. Ferdi Iskandar"
version: "1.0.0"
created: "2026-10-14"
last_verified: "2026-10-14"
applies_to: "projects/healthcare/sentrapedia/apps/site"
source_of_truth: true
supersedes: []
related_requirements: []
related_decisions: []
related_evidence: []
agent_readable: true
agent_editable: false
human_approval_required: true
classification: SENTRA
review_trigger: "material change to purpose, architecture, runtime, data handling, risk, or evidence"
---

# Document Index

## Function
Preserve the active SPDS document inventory and its authority.

The files in this directory are authoritative for project purpose, scope, requirements, risk, and evidence. Legacy documents in `docs/` remain supporting evidence and yield to this directory when they conflict.

## Overlays

- CORE and SENTRA: active.
- Data, privacy, security, operations, dependency, and release documents: active because the site subsystem serves HTTP, accepts contact fields, and can call Resend.
- Healthcare H01-H10: active as a non-device classification boundary.
- AI and agent overlays: omitted because this site subsystem runs no model and delegates no actions.

## Active documents

| ID | Document | Layer | Function |
| --- | --- | --- | --- |
| 01 | [Read First](read_first.md) | CORE | GUIDE |
| 00 | [Document Index](document_index.md) | SENTRA | PRESERVE |
| 02 | [Project Charter](project_charter.md) | CORE | AUTHORIZE |
| 03 | [Purpose and Outcomes](purpose_and_outcomes.md) | CORE | DEFINE |
| 04 | [Success Criteria](success_criteria.md) | CORE | DEFINE |
| 05 | [Scope and Boundaries](scope_and_boundaries.md) | CORE | DEFINE |
| 06 | [Stakeholder Map](stakeholder_map.md) | CORE | DEFINE |
| 07 | [Authority and Decision Rights](authority_and_decision_rights.md) | CORE | AUTHORIZE |
| 08 | [Roles And Responsibilities](roles_and_responsibilities.md) | CORE | DEFINE |
| 09 | [Glossary](glossary.md) | CONDITIONAL | PRESERVE |
| 10 | [Project Status](project_status.md) | CORE | PRESERVE |
| 11 | [Product Brief](product_brief.md) | CORE | DEFINE |
| 12 | [Product Requirements Document](prd.md) | CORE | DEFINE |
| 13 | [System Requirements](system_requirements.md) | CORE | DEFINE |
| 14 | [Functional Requirements](functional_requirements.md) | CONDITIONAL | DEFINE |
| 15 | [Quality Requirements](quality_requirements.md) | CORE | DEFINE |
| 16 | [Use Cases](use_cases.md) | CONDITIONAL | DEFINE |
| 17 | [User Journeys](user_journeys.md) | CONDITIONAL | DEFINE |
| 18 | [Acceptance Criteria](acceptance_criteria.md) | CORE | VERIFY |
| 19 | [Requirements Traceability Matrix](requirements_traceability_matrix.md) | CORE | VERIFY |
| 20 | [System Context](system_context.md) | CORE | DEFINE |
| 21 | [Architecture](architecture.md) | CORE | DECIDE |
| 23 | [Adr Index](adr_index.md) | CORE | DECIDE |
| 24 | [Adr-0001](adr/adr-0001.md) | CORE | DECIDE |
| 25 | [Data Architecture](data_architecture.md) | CONDITIONAL | DEFINE |
| 26 | [Interface Contracts](interface_contracts.md) | CONDITIONAL | DEFINE |
| 27 | [Api Specification](api_specification.md) | CONDITIONAL | DEFINE |
| 28 | [Deployment Architecture](deployment_architecture.md) | CONDITIONAL | DEFINE |
| 29 | [Dependency Architecture](dependency_architecture.md) | CONDITIONAL | DEFINE |
| 30 | [Engineering Plan](engineering_plan.md) | CORE | GUIDE |
| 31 | [Implementation Plan](implementation_plan.md) | CORE | GUIDE |
| 32 | [Delivery Roadmap](delivery_roadmap.md) | CORE | GUIDE |
| 33 | [Release Strategy](release_strategy.md) | CONDITIONAL | GUIDE |
| 34 | [Configuration Management](configuration_management.md) | CORE | GUIDE |
| 35 | [Change Management](change_management.md) | CORE | GUIDE |
| 36 | [Dependency Policy](dependency_policy.md) | CONDITIONAL | GUIDE |
| 37 | [Build And Release](build_and_release.md) | CONDITIONAL | GUIDE |
| 39 | [Definition Of Done](definition_of_done.md) | CORE | VERIFY |
| 40 | [Quality Plan](quality_plan.md) | CORE | VERIFY |
| 41 | [Verification and Validation Plan](verification_and_validation_plan.md) | CORE | VERIFY |
| 42 | [Test Strategy](test_strategy.md) | CORE | VERIFY |
| 43 | [Test Specification](test_specification.md) | CONDITIONAL | VERIFY |
| 44 | [Test Cases](test_cases.md) | CONDITIONAL | VERIFY |
| 45 | [Evaluation Plan](evaluation_plan.md) | CONDITIONAL | VERIFY |
| 46 | [Evaluation Report](evaluation_report.md) | CONDITIONAL | VERIFY |
| 47 | [Acceptance Report](acceptance_report.md) | CORE | VERIFY |
| 48 | [Verification Evidence Index](verification_evidence_index.md) | SENTRA | VERIFY |
| 50 | [Risk Management Plan](risk_management_plan.md) | CORE | GUIDE |
| 51 | [Risk Register](risk_register.md) | CORE | PRESERVE |
| 52 | [Threat Model](threat_model.md) | CONDITIONAL | DEFINE |
| 53 | [Security Architecture](security_architecture.md) | CONDITIONAL | DECIDE |
| 54 | [Security Requirements](security_requirements.md) | CONDITIONAL | DEFINE |
| 55 | [Secure Development Plan](secure_development_plan.md) | CONDITIONAL | GUIDE |
| 56 | [Vulnerability Management](vulnerability_management.md) | CONDITIONAL | GUIDE |
| 57 | [Incident Response Plan](incident_response_plan.md) | CONDITIONAL | GUIDE |
| 58 | [Business Continuity Plan](business_continuity_plan.md) | CONDITIONAL | GUIDE |
| 59 | [Disaster Recovery Plan](disaster_recovery_plan.md) | CONDITIONAL | GUIDE |
| 60 | [Data Governance](data_governance.md) | CONDITIONAL | GUIDE |
| 61 | [Data Inventory](data_inventory.md) | CONDITIONAL | PRESERVE |
| 62 | [Data Flow Map](data_flow_map.md) | CONDITIONAL | DEFINE |
| 63 | [Data Classification](data_classification.md) | CONDITIONAL | DEFINE |
| 64 | [Privacy Impact Assessment](privacy_impact_assessment.md) | CONDITIONAL | VERIFY |
| 65 | [Data Retention Policy](data_retention_policy.md) | CONDITIONAL | GUIDE |
| 66 | [Data Processing Register](data_processing_register.md) | CONDITIONAL | PRESERVE |
| 110 | [Operations Plan](operations_plan.md) | CONDITIONAL | GUIDE |
| 111 | [Runbook](runbook.md) | CONDITIONAL | GUIDE |
| 112 | [Observability Plan](observability_plan.md) | CONDITIONAL | GUIDE |
| 114 | [Alerting Policy](alerting_policy.md) | CONDITIONAL | GUIDE |
| 116 | [Incident Runbook](incident_runbook.md) | CONDITIONAL | GUIDE |
| 117 | [Postmortem Template](postmortem_template.md) | CONDITIONAL | PRESERVE |
| 118 | [Maintenance Plan](maintenance_plan.md) | CONDITIONAL | GUIDE |
| 132 | [License Register](license_register.md) | CONDITIONAL | PRESERVE |
| 133 | [Ip Register](ip_register.md) | CONDITIONAL | PRESERVE |
| 134 | [Third Party Register](third_party_register.md) | CONDITIONAL | PRESERVE |
| 135 | [Software Bill of Materials](software_bill_of_materials.md) | CONDITIONAL | PRESERVE |
| 136 | [Vendor Risk Register](vendor_risk_register.md) | CONDITIONAL | PRESERVE |
| H01 | [Intended Medical Use](intended_medical_use.md) | DOMAIN | DEFINE |
| H02 | [Clinical Requirements](clinical_requirements.md) | DOMAIN | DEFINE |
| H03 | [Clinical Safety Plan](clinical_safety_plan.md) | DOMAIN | GUIDE |
| H04 | [Medical Risk Management File](medical_risk_management_file.md) | DOMAIN | PRESERVE |
| H05 | [Software Safety Classification](software_safety_classification.md) | DOMAIN | DECIDE |
| H06 | [Clinical Evaluation Plan](clinical_evaluation_plan.md) | DOMAIN | VERIFY |
| H07 | [Clinical Evaluation Report](clinical_evaluation_report.md) | DOMAIN | VERIFY |
| H08 | [Usability Engineering File](usability_engineering_file.md) | DOMAIN | PRESERVE |
| H09 | [Benefit Risk Analysis](benefit_risk_analysis.md) | DOMAIN | VERIFY |
| H10 | [Post Market Monitoring Plan](post_market_monitoring_plan.md) | DOMAIN | GUIDE |
| S02 | [Purpose Contract](purpose_contract.md) | SENTRA | AUTHORIZE |
| S03 | [Epistemic Ledger](epistemic_ledger.md) | SENTRA | PRESERVE |
| S04 | [Current State Snapshot](current_state_snapshot.md) | SENTRA | PRESERVE |
| S05 | [Project Drift Ledger](project_drift_ledger.md) | SENTRA | VERIFY |
| S06 | [Goal to Evidence Matrix](goal_to_evidence_matrix.md) | SENTRA | VERIFY |
| S07 | [Decision Provenance](decision_provenance.md) | SENTRA | DECIDE |
| S09 | [Change Impact Packet](change_impact_packet.md) | SENTRA | GUIDE |
| S10 | [Context Handoff Packet](context_handoff_packet.md) | SENTRA | PRESERVE |
| S11 | [Failure Boundary Map](failure_boundary_map.md) | SENTRA | DEFINE |
| STD | [Sentra Project Documentation Standard](spds.md) | SENTRA | PRESERVE |
