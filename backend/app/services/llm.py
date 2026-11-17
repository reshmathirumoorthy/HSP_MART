"""Optional language-model layer: rewords drafts only. Decisions and money stay in deterministic code.
Without ANTHROPIC_API_KEY, or on any error, the deterministic draft is returned unchanged."""
import re
from ..config import settings

SYSTEM = ("You polish short business messages for HSP Mart, an Indian corporate gifting company. Keep every fact, number, "
          "name and date exactly as given; never add prices, discounts, promises or delivery dates. Keep the same language "
          "(English or Hindi). Reply with the message text only.")


def polish_text(draft: str, instruction: str) -> str:
    s = settings()
    if not s.anthropic_api_key:
        return draft
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=s.anthropic_api_key, timeout=15.0, max_retries=1)
        res = client.beta.messages.create(
            model=s.ai_model,
            max_tokens=1024,
            output_config={"effort": "low"},
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
            system=SYSTEM,
            messages=[{"role": "user", "content": f"{instruction}\n\nDraft:\n{draft}"}],
        )
        if res.stop_reason != "end_turn":
            return draft
        text = "".join(b.text for b in res.content if b.type == "text").strip()
        # Guard: the rewrite must keep every number from the draft.
        nums = re.findall(r"\d[\d,.]*", draft)
        return text if text and len(text) < 1500 and all(n in text for n in nums) else draft
    except Exception:  # noqa: BLE001 — never let wording break the feature
        return draft
