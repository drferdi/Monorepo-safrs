# Architected and built by codieverse+.
from __future__ import annotations


def commit_final_response(
    history: list,
    final_text: str,
    *,
    visible_prompt: str,
) -> str:
    """Commit the single finalized clinical output to conversation history."""
    if history:
        history[-1]["content"] = visible_prompt
    history.append({"role": "assistant", "content": final_text})
    return final_text
