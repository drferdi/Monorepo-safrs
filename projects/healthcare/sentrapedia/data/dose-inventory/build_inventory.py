"""Therapy/dose completeness inventory across the Sentrapedia knowledge sources. Read-only on sources."""
import json, glob, re, sqlite3, collections, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
DOSE = re.compile(r"\d+(?:[.,]\d+)?\s*(?:-\s*\d+(?:[.,]\d+)?\s*)?(mg|mcg|µg|gram|g|ml|iu|unit|tetes|puff|semprot|tablet|tab|kapsul|supp|%)(?![a-z])", re.I)
STOP = set("dan atau pada dengan yang di ke dari akut kronik kronis penyakit infeksi tata laksana tatalaksana sindrom sindroma tipe dewasa anak tanpa termasuk".split())
SYN = {"rhinitis":"rinitis","alergika":"alergi","alergik":"alergi","scabies":"skabies","leprosy":"kusta","lepra":"kusta","hansen":"kusta",
 "gondong":"parotitis","gondongan":"parotitis","mumps":"parotitis","ambeien":"hemoroid","campak":"morbili","measles":"morbili",
 "varicella":"varisela","cacar":"varisela","air":"","copd":"ppok","obstruktif":"ppok","paru":"","pityriasis":"pitiriasis","vesikolor":"versikolor",
 "panu":"versikolor","bells":"bell","kandidosis":"kandidiasis","retinopati":"retinopati","diabetik":"diabetika","gastroesofageal":"gerd",
 "gastroesophageal":"gerd","gastroesofagus":"gerd","refluks":"gerd","reflux":"gerd","disease":"","herpes":"herpes","simplex":"simpleks",
 "appendisitis":"apendisitis","tuberkolosis":"tuberkulosis","tbc":"tuberkulosis","tb":"tuberkulosis","migrain":"migren","dislipidemia":"hiperlipidemia",
 "kudis":"skabies","jerawat":"akne","tifoid":"tifoid","tipes":"tifoid","dbd":"dengue","berdarah":"","demam":"demam","hordeolum":"hordeolum","bintitan":"hordeolum",
 "oma":"otitis","csom":"otitis","konjungtivitis":"konjungtivitis","biduran":"urtikaria","oksiuriasis":"enterobiasis","kremi":"enterobiasis","tambang":"ankilostomiasis","cacing":""}
def _norm(text):
    out = set()
    for t in re.findall(r"[a-z]+", text.lower().replace("’", "").replace("'", "")):
        t = SYN.get(t, t)
        if t and t not in STOP and len(t) > 2: out.add(t)
    return out
def toks(name):
    return _norm(name)
def aliases(name):
    parts = [re.sub(r"\(.*?\)", " ", name)] + [x for seg in re.findall(r"\((.*?)\)", name) for x in seg.split("/")]
    return [a for a in (frozenset(_norm(x)) for x in parts) if a]
def cats(code):
    out = set()
    for part in re.split(r"[,;/]", code.upper()):
        m = re.findall(r"([A-Z])(\d\d)", part)
        if "-" in part and len(m) == 2 and m[0][0] == m[1][0]:
            out |= {f"{m[0][0]}{n:02d}" for n in range(int(m[0][1]), int(m[1][1]) + 1)}
        else:
            out |= {a + b for a, b in m}
    return out
recs = []
A = json.load(open(ROOT / "oracle/sentrapedia.json", encoding="utf-8"))["diseases"]
for d in A:
    recs.append(dict(src="A", nama=d["nama"], kode=d["kode"], terapi=d["terapi"], slug=None, origin="SKDI"))
for f in sorted(glob.glob(str(ROOT / "oracle-ii/knowledge_base/json/*.json"))):
    e = json.load(open(f, encoding="utf-8"))
    t = "" if e["terapi"].startswith("Belum tersedia") else e["terapi"]
    recs.append(dict(src="B", nama=e["nama"], kode=e["kode_icd"], terapi=t, slug=e["slug"], origin=e["metadata"].get("origin_type")))
C = json.load(open(OUT / "penyakit.json", encoding="utf-8"))["penyakit"]
for p in C:
    seen, rows = set(), []
    for t in p["terapi"]:
        key = t["obat"].lower()
        if key in seen: continue
        seen.add(key)
        rows.append(f"{t['obat']} {t['dosis']} {t['frek']}".replace(" - Sesuai PPK", " (dosis tidak tercantum)"))
    recs.append(dict(src="C", nama=p["nama"], kode=p["icd10"], terapi="; ".join(rows), slug=None, origin="KKI",
                     c_numeric=any(re.search(r"\d", t["dosis"]) for t in p["terapi"])))
db = sqlite3.connect(f"file:{ROOT/'oracle-ii/sentra_clinical_core_source_reparsed.sqlite'}?mode=ro&immutable=1", uri=True)
pnpk = {}
for file_no, slug, fn, pc in db.execute("select file_no,disease_slug,filename,page_count from source_documents_v2"):
    pages = [r[0] for r in db.execute("select pdf_page from source_pages_v2 where file_no=? and (text_search glob '*[0-9] mg*' or text_search glob '*[0-9]mg*' or text_search like '%mg/kg%') order by 1", (file_no,))]
    pnpk[slug] = dict(file=fn, pages=pc, dose_pages=pages)
old_docs = [dict(zip(("file_no", "topic", "filename", "pages"), r)) for r in db.execute("select file_no,topic,filename,page_count from documents")]
for r in recs:
    r["tok"], r["cat"], r["al"] = toks(r["nama"]), cats(r["kode"]), aliases(r["nama"])
    r["numeric"] = r.get("c_numeric", bool(DOSE.search(r["terapi"])))
parent = list(range(len(recs)))
def find(i):
    while parent[i] != i:
        parent[i] = parent[parent[i]]; i = parent[i]
    return i
for i, a in enumerate(recs):
    for j in range(i + 1, len(recs)):
        b = recs[j]
        if a["src"] == b["src"]: continue
        if not a["tok"] or not b["tok"]: continue
        inter = a["tok"] & b["tok"]
        jac = len(inter) / len(a["tok"] | b["tok"])
        sub = inter and (a["tok"] <= b["tok"] or b["tok"] <= a["tok"])
        same_cat = bool(a["cat"] & b["cat"])
        alias_eq = any(x == y for x in a["al"] for y in b["al"])
        alias_sub = any(x <= y or y <= x for x in a["al"] for y in b["al"])
        if a["tok"] == b["tok"] or alias_eq or (same_cat and (jac >= 0.34 or sub or alias_sub)):
            parent[find(i)] = find(j)
groups = collections.defaultdict(list)
for i, r in enumerate(recs): groups[find(i)].append(r)
rows = []
for g in groups.values():
    by = {s: [r for r in g if r["src"] == s] for s in "ABC"}
    first = next(r for s in "BAC" for r in by[s])
    slugs = [r["slug"] for r in by["B"] if r["slug"] in pnpk]
    old = [d for d in old_docs if any(t in toks(d["topic"] or d["filename"]) for t in first["tok"])]
    numeric = [s for s in "ABC" if any(r["numeric"] for r in by[s])]
    text = [s for s in "ABC" if any(r["terapi"].strip() for r in by[s])]
    dose_pages = sum(len(pnpk[s]["dose_pages"]) for s in slugs)
    status = "lengkap" if numeric else ("narasi_tanpa_dosis" if text else "kosong")
    rows.append(dict(nama=first["nama"], names={s: [r["nama"] for r in by[s]] for s in "ABC" if by[s]},
                     kode=sorted({r["kode"] for r in g}), origin=sorted({r["origin"] for r in g if r["origin"]}),
                     status=status, numeric_sources=numeric, text_sources=text,
                     terapi={s: " || ".join(r["terapi"] for r in by[s] if r["terapi"].strip()) for s in "ABC" if by[s]},
                     pnpk=[dict(file=pnpk[s]["file"], pages=pnpk[s]["pages"], dose_pages=pnpk[s]["dose_pages"]) for s in slugs],
                     pnpk_dose_pages=dose_pages, n_sources=len([s for s in "ABC" if by[s]])))
rows.sort(key=lambda r: r["nama"].lower())
json.dump(dict(rows=rows, old_docs=old_docs), open(OUT / "inventory.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
c = collections.Counter(r["status"] for r in rows)
print("records", len(recs), "-> unique diseases", len(rows), dict(c))
print("by number of sources:", collections.Counter(r["n_sources"] for r in rows))
print("lengkap by numeric source count:", collections.Counter(len(r["numeric_sources"]) for r in rows if r["status"] == "lengkap"))
inc = [r for r in rows if r["status"] != "lengkap"]
print("incomplete:", len(inc), "| with PNPK dose pages available:", sum(1 for r in inc if r["pnpk_dose_pages"]), "| PNPK-origin:", sum(1 for r in inc if "PNPK" in r["origin"]))
print("big groups:", [(r["nama"], sum(len(v) for v in r["names"].values())) for r in rows if sum(len(v) for v in r["names"].values()) > 4])
