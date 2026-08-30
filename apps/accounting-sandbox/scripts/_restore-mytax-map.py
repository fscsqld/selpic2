import json
from pathlib import Path

transcript = Path(
    r"C:\Users\fscsq\.cursor\projects\c-Users-fscsq-Desktop-selpic2\agent-transcripts"
    r"\ba869bec-f671-461a-8969-bb51af2a139f\ba869bec-f671-461a-8969-bb51af2a139f.jsonl"
)
out = Path(
    r"c:\Users\fscsq\Desktop\selpic2\apps\accounting-sandbox\lib\ato-lodgment\mytax-field-map.ts"
)
best = ""
best_src = ""
with transcript.open(encoding="utf-8") as f:
    for line in f:
        if "mytax-field-map.ts" not in line:
            continue
        try:
            obj = json.loads(line)
        except json.JSONDecodeError:
            continue
        content = obj.get("message", {}).get("content", [])
        if not isinstance(content, list):
            continue
        for block in content:
            if block.get("type") != "tool_use":
                continue
            inp = block.get("input") or {}
            path = str(inp.get("path") or "")
            if not path.replace("\\", "/").endswith("mytax-field-map.ts"):
                continue
            body = inp.get("contents") or inp.get("new_string") or ""
            if not isinstance(body, str):
                continue
            if "buildMyTaxAnnualFields" not in body and "export function build" not in body:
                continue
            if len(body) > len(best):
                best = body
                best_src = block.get("name", "")

if best:
    out.write_text(best, encoding="utf-8")
    print(f"restored {len(best)} chars via {best_src}")
else:
    print("no restore candidate")
