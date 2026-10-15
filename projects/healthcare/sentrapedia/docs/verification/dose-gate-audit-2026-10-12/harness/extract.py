"""Turn a MIRA audit log into gate replay inputs: one item per eval case and path.

usage: python -I .runtime/audit/extract.py <audit.jsonl> <since-iso> <out.json>
The last entry per (path, query) wins, so earlier tries of the same case are ignored.
"""
import json
import sys

log, since, out = sys.argv[1:4]
queries = {q["query"]: q["id"] for q in json.load(open("docs/verification/theoracle-eval-2026-10-11/eval-set.json", encoding="utf-8"))["queries"] if q.get("gold") and not q.get("term")}
legacy, targeted_dx, targeted_tx = {}, {}, {}
for line in open(log, encoding="utf-8"):
    e = json.loads(line)
    if e["loggedAt"] < since or e["status"] != "ok":
        continue
    r, resp = e["request"], e["response"]
    case_id = queries.get(r["case"]["chiefComplaint"])
    if not case_id:
        continue
    if "diagnosis" in r:
        targeted_tx[case_id] = (e["traceId"], r, resp)
    elif r.get("omitTherapy"):
        targeted_dx[case_id] = (e["traceId"], r, resp)
    else:
        legacy[case_id] = (e["traceId"], r, resp)

def likely(resp):
    first = (resp["differential"].get("likely") or [None])[0]
    return {"icd10": first["icd10"], "label": first["label"]} if first else None

items = []
for case_id, (trace, r, resp) in legacy.items():
    items.append({"id": case_id, "path": "legacy", "traceId": trace, "query": r["case"]["chiefComplaint"], "diagnosis": likely(resp), "therapy": resp.get("therapy"), "bundle": r["grounding"], "dxBundle": r["grounding"]})
for case_id, (trace, r, resp) in targeted_tx.items():
    dx = targeted_dx.get(case_id)
    items.append({"id": case_id, "path": "targeted", "traceId": trace, "query": r["case"]["chiefComplaint"], "diagnosis": r["diagnosis"], "therapy": resp.get("therapy"), "bundle": r["grounding"], "dxBundle": dx[1]["grounding"] if dx else None})
json.dump({"log": log, "since": since, "items": items}, open(out, "w", encoding="utf-8"), ensure_ascii=False)
print(f"legacy {len(legacy)}, targeted dx {len(targeted_dx)}, targeted tx {len(targeted_tx)} -> {len(items)} items")
