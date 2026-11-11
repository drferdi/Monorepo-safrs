"""For each non-verified drug in a replay rows file, look for dose evidence in the whole TheOracle corpus.

usage: python -I .runtime/audit/corpus_scan.py <rows.json> <path> <out.json>
Word handling mirrors theoracle-evidence-gate.ts (spell, tokens, names, diagnosisWords); strength detection is a
simplified number+unit pattern, so the counts locate candidates for reading, they do not decide anything.
"""
import json
import re
import sys
import unicodedata

rows_file, path, out = sys.argv[1:4]

def spell(w):
    w = w.replace("ph", "f").replace("th", "t").replace("x", "ks")
    w = re.sub(r"c(?=[eiy])", "s", w).replace("c", "k").replace("y", "i")
    w = re.sub(r"(.)\1+", r"\1", w)
    return re.sub(r"(.{4,})e$", r"\1", w)

def tokens(text):
    text = "".join(ch for ch in unicodedata.normalize("NFKD", text.lower()) if not unicodedata.combining(ch))
    return [spell(w) for w in re.split(r"[^a-z]+", text) if w]

GENERIC = {spell(w) for w in "kronis infeksi tanpa dengan komplikasi lain lainnya pada anak dewasa umum tidak lokasi spesifik acute chronic disease infection syndrome disorder without complication unspecified specified other status type tipe primer sekunder adult child fever signs warning human virus organism origin site acquired upper lower tract essential primary secondary mild moderate severe recurrent bacterial viral elsewhere classified presumed nos nec".split()}
catalog = json.load(open("oracle/sentrapedia.json", encoding="utf-8"))["diseases"]
counts = {}
for d in catalog:
    for w in set(tokens(d["nama"])):
        counts[w] = counts.get(w, 0) + 1

def includes(source, code):
    for token in source.upper().split(","):
        token = token.strip()
        m = re.fullmatch(r"([A-Z]\d{2})-([A-Z]\d{2})", token)
        if (m and m.group(1) <= code[:3] <= m.group(2)) or code == token or code.startswith(token + "."):
            return True
    return False

def diagnosis_words(dx):
    names = [dx["label"]] + [d["nama"] for d in catalog if includes(d["kode"], dx["icd10"].strip().upper())]
    words = set()
    for name in names:
        words |= {w for w in tokens(name) if len(w) >= 4 and counts.get(w, 0) < 3}
        if name != name.upper():
            words |= {t for caps in re.findall(r"\b[A-Z]{2,}\b", name) if not re.fullmatch(r"[IVXL]+", caps) for t in tokens(caps)}
    return words - GENERIC

STRENGTH = re.compile(r"(\d+(?:[.,]\d+)?)\s*(mg|mcg|µg|μg|g|gram|iu|ui|unit|ml|meq|mmol|tetes|tablet|tab|kapsul|%)(?![a-z])", re.I)
chunks = [json.loads(line) for line in open("theoracle/index/chunks.jsonl", encoding="utf-8")]
for c in chunks:
    c["_words"] = set(tokens(c["text"])) | set(tokens(c["title"]))

data = json.load(open(rows_file, encoding="utf-8"))
results = []
for r in data["rows"]:
    if r["path"] != path or r["status"] == "verified":
        continue
    drug_words = [w for w in tokens(r["drug"]) if len(w) >= 4]
    dx_words = diagnosis_words(r["diagnosis"])
    model_numbers = [m.group(1).replace(",", ".") for m in STRENGTH.finditer(r["dose"] + " " + r["drug"])]
    sent = {p["text"] for p in r["namingPassages"] if p}
    hits = []
    for c in chunks:
        if not drug_words or not all(w in c["_words"] for w in drug_words) or not (dx_words & c["_words"]):
            continue
        text = c["text"].lower()
        positions = [m.start() for w in drug_words for m in re.finditer(w[:5], text)]
        near = sorted({m.group(0) for p in positions for m in STRENGTH.finditer(text[p:p + 160])})
        all_model = bool(model_numbers) and all(re.search(rf"(?<![\d.,]){re.escape(n).replace('\\.', '[.,]')}(?![\d])", text) for n in model_numbers)
        hits.append({"title": c["title"], "id": c["id"], "strengthsNearDrug": near[:8], "hasAllModelNumbers": all_model, "inSentBundle": any(c["text"].strip()[:200] in s or s[:200] in c["text"] for s in sent)})
    results.append({**{k: r[k] for k in ("id", "traceId", "query", "diagnosis", "drug", "dose", "status", "reason", "verifiedIfAboutForced", "verifiedWithDxBundle")},
                    "diagnosisWords": sorted(dx_words), "modelNumbers": model_numbers, "sentNamingTitles": [p["title"] for p in r["namingPassages"] if p],
                    "corpusHits": len(hits), "corpusHitsWithDoseNearDrug": sum(1 for h in hits if h["strengthsNearDrug"]),
                    "corpusHitsWithModelNumbers": sum(1 for h in hits if h["hasAllModelNumbers"]), "hits": hits[:6]})
json.dump(results, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(len(results), "rows")
