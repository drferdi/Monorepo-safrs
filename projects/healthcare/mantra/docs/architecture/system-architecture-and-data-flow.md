# System Architecture and Data Flow

Status: scaffold baseline
Date: 2026-07-16

## Purpose

Document the current Sentra MANTRA system architecture and core data flows based on repository contents.

## Architecture summary

Sentra MANTRA currently runs as a Frappe Bench v15 with one site, `mantra.localhost`. It is a modular monolith / app-based Frappe platform, not a microservice architecture. Upstream Frappe apps provide framework, ERP, HR, and healthcare capabilities. Sentra custom apps add domain-specific behavior without modifying upstream source.

## Installed apps

- `frappe` 15.114.0
- `erpnext` 15.116.0
- `hrms` 15.62.2
- `healthcare` 15.2.0
- `sentra_mantra_core` 0.0.1
- `sentra_mantra_hospital` 0.0.1
- `sentra_mantra_indonesia` 0.0.1
- `sentra_mantra_integrations` 0.0.1
- `sentra_mantra_portal` 0.0.1

## Runtime components

```text
Browser / Frappe Desk
  -> bench web server on port 8000
  -> Frappe Framework routing/RPC/permissions
  -> Custom Sentra app Python methods
  -> MariaDB site database
  -> Redis cache/queue/socketio
  -> Worker/scheduler for background and scheduled jobs
```

## Custom app responsibility

- `sentra_mantra_core`: shared utilities, navigation, branding, organization positions, employee import.
- `sentra_mantra_hospital`: hospital/clinical extensions; currently scaffolded.
- `sentra_mantra_indonesia`: Indonesian/RSIA localization, workspace dashboard blocks, HR setup, profile page.
- `sentra_mantra_integrations`: future SATUSEHAT/BPJS adapters; currently scaffolded.
- `sentra_mantra_portal`: future portal/frontend/BFF boundary; currently scaffolded.

## Workspace dashboard flow

```text
User opens Frappe Desk workspace
  -> Workspace loads Custom HTML Block
  -> block JavaScript calls frappe.call("sentra_mantra_indonesia.<module>.data")
  -> Python method checks permissions and queries DocTypes
  -> response renders cards, actions, panels, empty states
```

## Profile flow

```text
Home profile block or /me
  -> my_profile()
  -> User + Employee + Healthcare Practitioner + HRMS leave balance
  -> rendered profile, leave balance, STR/SIP, facility
```

## Setup/migration flow

```text
bench execute setup/build function
  -> create/update Frappe Workspace, Custom HTML Block, settings, HR records, or Designations
  -> commit to MariaDB
  -> Desk reflects updated configuration after reload/cache clear
```

## External integration target flow

Future SATUSEHAT/BPJS integrations must follow:

```text
Internal transaction persisted in Frappe/MariaDB
  -> integration outbox/retry queue in sentra_mantra_integrations
  -> external API call
  -> response/reconciliation record
  -> internal record remains source of truth even if external call fails
```

## Current architectural constraints

- Do not directly modify upstream apps.
- Resolve boundary ambiguity through ADRs.
- Do not expose future portal through generic DocType REST API directly.
- Do not store credentials in `Data` fields.
- Do not log/read sensitive config or PHI/PII.
