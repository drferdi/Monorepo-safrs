# Architected and built by codieverse+.
from __future__ import annotations

from typing import Any, Callable


def build_clinical_intake_context(
    user_input: str,
    pasien: dict,
    *,
    kasus: dict | None = None,
    build_case_prompt: Callable[[dict, dict], str],
    check_insufficient_data_state: Callable[[dict, dict], dict],
    detect_sparse_complaint: Callable[[dict], dict],
    detect_uncertain_context: Callable[[dict, dict], dict],
    build_no_fabrication_instruction: Callable[[dict, dict], str],
) -> dict[str, Any]:
    """Build a shared clinical prompt context for CLI and TUI callers."""
    case = kasus if kasus is not None else {"keluhan": (user_input or "").strip()}
    augmented_prompt = build_case_prompt(case, pasien) or user_input

    insufficient_result = check_insufficient_data_state(case, pasien)
    sparse_result = detect_sparse_complaint(case)
    conservative_note = insufficient_result.get(
        "conservative_prompt_addition"
    ) or sparse_result.get("conservative_prompt_addition")
    if conservative_note:
        augmented_prompt = augmented_prompt + "\n\n" + conservative_note

    uncertain_ctx = detect_uncertain_context(case, pasien)
    if uncertain_ctx.get("is_uncertain"):
        provisional_instruction = uncertain_ctx.get(
            "provisional_language_instruction", ""
        )
        if provisional_instruction:
            augmented_prompt = augmented_prompt + "\n\n" + provisional_instruction

    no_fab_instruction = build_no_fabrication_instruction(case, pasien)
    if no_fab_instruction:
        augmented_prompt = augmented_prompt + "\n\n" + no_fab_instruction

    return {
        "kasus": case,
        "augmented_prompt": augmented_prompt,
        "insufficient_result": insufficient_result,
        "sparse_result": sparse_result,
        "uncertain_ctx": uncertain_ctx,
        "no_fab_instruction": no_fab_instruction,
    }
