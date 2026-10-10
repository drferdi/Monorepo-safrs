"""Which case data may be sent to which model provider (MIRA_DATA_POLICY).

The value is the project owner's data-governance decision; code never picks anything but the
development default `synthetic-only`. Neither provider is zero-data-retention by default:
OpenAI's API keeps data up to 30 days for abuse monitoring unless OpenAI approves ZDR, and
OpenRouter's ZDR routing depends on the model having a ZDR endpoint.

- synthetic-only             any provider; only cases marked as synthetic
- openai-standard-retention  OpenAI directly, standard retention (up to 30 days)
- openai-zdr-approved        OpenAI directly, under an OpenAI-approved ZDR agreement
- openrouter-zdr             OpenRouter with the fixed ZDR policy (common/providers.py)
"""

from __future__ import annotations

DATA_POLICIES = ("synthetic-only", "openai-standard-retention", "openai-zdr-approved", "openrouter-zdr")
POLICY_PROVIDER = {
    "openai-standard-retention": "openai",
    "openai-zdr-approved": "openai",
    "openrouter-zdr": "openrouter",
}
DEVELOPMENT_DEFAULT = "synthetic-only"

# HTTP requests mark a synthetic case with this header; the request contract (owned by
# Med Assist) has no field for it. Case files mark it with "synthetic": true.
SYNTHETIC_HEADER = "X-MIRA-Case-Origin"
SYNTHETIC_VALUE = "synthetic"


def policy_problem(policy: str | None, provider: str) -> str | None:
    """Why this policy cannot be used with this provider, or None."""
    if not policy:
        return "MIRA_DATA_POLICY is not set."
    if policy not in DATA_POLICIES:
        return f"Unknown MIRA_DATA_POLICY '{policy}' (use one of {', '.join(DATA_POLICIES)})."
    required = POLICY_PROVIDER.get(policy)
    if required and required != provider:
        return f"MIRA_DATA_POLICY={policy} requires provider '{required}', not '{provider}'."
    return None


def is_synthetic_request(header_value: str | None) -> bool:
    return (header_value or "").strip().lower() == SYNTHETIC_VALUE


def is_synthetic_case_file(case: dict) -> bool:
    return case.get("synthetic") is True
