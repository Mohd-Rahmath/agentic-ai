import json
import logging
import os
import re

from openai import OpenAI

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a local search assistant. Given a user query about finding places near a location, respond with a JSON object containing:
- "locations": array of up to 5 relevant places, each with:
  - "name": business/place name
  - "address": street address in that city/area
  - "distance": estimated distance from the reference point (e.g. "350m", "1.2km")
  - "description": one sentence about why it's a good choice
  - "rating": rating out of 5 (e.g. "4.3/5")
- "summary": one sentence summarizing the search results

Only return valid JSON. No markdown, no code blocks, just the raw JSON object."""


class AgenticLocationService:
    MODEL = "google/gemma-4-31b-it:free"

    def __init__(self):
        self.client = OpenAI(
            api_key=os.environ.get("OPENROUTER_API_KEY"),
            base_url="https://openrouter.ai/api/v1",
        )

    def search(self, query: str) -> dict:
        logger.info("Agentic location search: %s", query)
        completion = self.client.chat.completions.create(
            model=self.MODEL,
            max_tokens=1024,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": query},
            ],
        )

        raw = ""
        if completion.choices:
            content = completion.choices[0].message.content
            if isinstance(content, str):
                raw = content.strip()
            elif isinstance(content, list):
                raw = " ".join(
                    b.get("text", "") if isinstance(b, dict) else getattr(b, "text", "")
                    for b in content
                ).strip()

        # Strip markdown code fences if present
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)

        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            logger.warning("Could not parse model JSON, returning raw: %s", raw[:200])
            return {"locations": [], "summary": raw or "No results found."}
