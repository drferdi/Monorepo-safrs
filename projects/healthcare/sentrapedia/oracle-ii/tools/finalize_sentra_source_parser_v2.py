#!/usr/bin/env python3
"""Fail-closed clinical field gate and reproducible QA for Sentra PNPK v2."""
import csv,hashlib,json,pathlib,sqlite3,zipfile,re,collections,shutil
from importlib.machinery import SourceFileLoader
R=pathlib.Path('/mnt/data');D=R/'SENTRA_KNOWLEDGE_BASE_SOURCE_REPARSED_V2';B=D/'knowledge_base';M='Belum tersedia — lengkapi dan verifikasi oleh klinisi'
p=SourceFileLoader('parser_v2',str(R/'sentra_source_parser_v2.py')).load_module()
new=[];records=[];overlap=collections.Counter(); flags={}
for path in sorted((B/'json').glob('*.json')):
 j=json.loads(path.read_text());q=j['metadata']['clinical_qa_status']=='SOURCE_ANCHORED_MACHINE_PARSE_REVIEW_REQUIRED'
 if q:
  assert 'source_provenance' in j and len(j.get('source_extraction_candidates',[]))>0
  j['definisi']=M;j['gejala']=[];j['diagnosis']=M;j['terapi']=M;j['rujukan']=M
  j['metadata'].update(source_candidate_promotion_blocked=True,clinical_retrieval_allowed=False,verified_clinical_kb=False,is_complete=False,clinical_qa_status='SOURCE_TEXT_ANCHORED_SEMANTIC_REVIEW_REQUIRED',clinical_approval='NOT_PERFORMED',clinical_scoping='EXACT_PDF_TEXT_UNINTERPRETED')
  title_terms=[w for w in p.canon(j['nama']).split() if len(w)>=4]
  for c in j['source_extraction_candidates']:
   quote=c['evidence_quote'].lower()
   topic_hits=sum(bool(re.search(r'\b'+re.escape(w)+r'\b',quote)) for w in title_terms[:4]);flagset=[]
   if topic_hits==0: flagset.append('TOPIC_ALIGNMENT_UNCONFIRMED')
   if c['category']=='definition' and (not re.search(r'\b(?:adalah|merupakan|didefinisikan)\b',quote) or not re.search(r'\b(?:penyakit|kondisi|keadaan|kelainan|gangguan|sindrom|infeksi|penurunan)\b',quote)):
    flagset.append('DEFINITION_SEMANTICS_UNCERTAIN')
   if c['category']=='symptoms' and re.search(r'\b(?:tata\s+laksana|pemberian|terapi|antiemetik|analgesik|antibiotik|operasi|dosis)\b',quote):
    flagset.append('SYMPTOM_VS_TREATMENT_MIXTURE')
   if c['category']=='diagnosis' and re.search(r'\b(?:tujuan\s+khusus|penelusuran\s+pustaka|sarana\s+dan\s+prasarana|apa\s+saja\s+pemeriksaan|bagaimana\s+diagnosis)\b',quote):
    flagset.append('METHODOLOGY_OR_ADMINISTRATIVE_MIXTURE')
   c['topic_anchor_hits']=topic_hits
   c['machine_risk_flags']=flagset
   c['semantic_review_status']='NOT_CLINICALLY_VERIFIED'
   for f in flagset:overlap[f]+=1
   flags[c['candidate_id']]=(topic_hits,flagset)
  new.append(j)
 path.write_text(json.dumps(j,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 (B/'markdown'/f'{j["slug"]}.md').write_text(p.to_md(j),encoding='utf-8')
 records.append(j)
assert len(new)==72 and len(records)==144
assert len([x for x in records if x['metadata'].get('clinical_qa_status')=='SOURCE_GROUNDED_DIAGNOSTIC_SUBSET'])==8
assert len([x for x in records if x['metadata'].get('clinical_qa_status')=='UNVERIFIED_NON_PNPK_CANDIDATE'])==64
catalog=json.loads((B/'catalog.json').read_text())
for d in catalog['diseases']:
 j=next(x for x in records if x['slug']==d['slug'])
 d['clinical_qa_status']=j['metadata'].get('clinical_qa_status');d['gejala_count']=len(j['gejala'])
 d['clinical_retrieval_allowed']=False;d['verified_clinical_kb']=False;d['is_complete']=False
 d['source_candidate_promotion_blocked']=bool(j['metadata'].get('source_candidate_promotion_blocked'))
(B/'catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
# Publish audit queue, not outputs that silently reclassify findings.
all_e=[]
with (D/'evidence/source_evidence_candidates.jsonl').open('w') as f:
 for j in new:
  for x in j['source_extraction_candidates']:
   all_e.append(x);f.write(json.dumps(x,ensure_ascii=False)+'\n')
assert len(all_e)==904
with (D/'evidence/clinical_review_queue.csv').open('w',newline='',encoding='utf-8-sig') as f:
 wr=csv.writer(f);wr.writerow(['candidate_id','disease_slug','pdf_filename','pdf_page','category_machine_suggested','topic_anchor_hits','risk_flags','review_state','source_quote'])
 for x in sorted(all_e,key=lambda r:(-len(r['machine_risk_flags']),r['source_file_no'],r['pdf_page'])):
  wr.writerow([x['candidate_id'],x['disease_slug'],x['source_pdf_filename'],x['pdf_page'],x['category'],x['topic_anchor_hits'],';'.join(x['machine_risk_flags']),x['semantic_review_status'],x['evidence_quote']])
# Same SQLite original 8-document facts preserved exactly; add only risk-flag table.
db=sqlite3.connect(D/'sentra_clinical_core_source_reparsed.sqlite')
db.execute('CREATE TABLE IF NOT EXISTS source_candidate_quality_v2(candidate_id TEXT PRIMARY KEY, topic_anchor_hits INTEGER NOT NULL, machine_risk_flags TEXT NOT NULL, semantic_review_status TEXT NOT NULL,FOREIGN KEY(candidate_id) REFERENCES source_candidates_v2(candidate_id))')
db.executemany('INSERT OR REPLACE INTO source_candidate_quality_v2 VALUES(?,?,?,?)',[(k,v[0],json.dumps(v[1]),'NOT_CLINICALLY_VERIFIED') for k,v in flags.items()])
db.execute("UPDATE source_candidates_v2 SET review_status='SOURCE_TEXT_EXACT_SEMANTIC_REVIEW_REQUIRED'")
db.execute("UPDATE source_documents_v2 SET clinical_review_status='SOURCE_TEXT_ANCHORED_SEMANTIC_REVIEW_REQUIRED'")
db.commit()
assert db.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
assert db.execute('PRAGMA foreign_key_check').fetchall()==[]
assert db.execute('SELECT COUNT(*) FROM source_candidates_v2').fetchone()[0]==904
assert db.execute('SELECT COUNT(*) FROM source_candidate_quality_v2').fetchone()[0]==904
assert db.execute('SELECT COUNT(*) FROM clinical_facts').fetchone()[0]==182
for id,q,source,start,end in db.execute('SELECT e.candidate_id,e.evidence_quote,p.text_search,e.source_char_offset,e.source_char_end FROM source_candidates_v2 e JOIN source_pages_v2 p ON e.file_no=p.file_no AND e.pdf_page=p.pdf_page'):
 assert source[start:end]==q,id
assert db.execute('SELECT COUNT(*) FROM source_documents_v2').fetchone()[0]==72
assert db.execute('SELECT COUNT(*) FROM source_pages_v2').fetchone()[0]==8332
db.close()
# Integrity against the exact downloaded originals.
for j in new:
 pv=j['source_provenance'];pdf=R/pv['filename'];assert pdf.exists()
 assert hashlib.sha256(pdf.read_bytes()).hexdigest()==pv['file_sha256']
 assert j['definisi']==j['diagnosis']==j['terapi']==j['rujukan']==M and not j['gejala']
 assert not j['metadata']['clinical_retrieval_allowed']
# Update source reproducibility tools: patched parser and finishing QA.
shutil.copy2(R/'sentra_source_parser_v2.py',D/'tools/sentra_source_parser_v2.py')
shutil.copy2(__file__,D/'tools/finalize_sentra_source_parser_v2.py')
qa=json.loads((D/'source_parser_qa_results.json').read_text())
qa.update({'postcuration_safety_gate':'PASS','machine_candidates_not_promoted_into_clinical_fields':True,'all_72_source_document_checksums':'PASS','all_904_candidate_quotes_page_exact':'PASS','all_144_kb_clinical_retrieval_disabled':True,'suspicious_candidate_review_counts':dict(overlap),'source_pdfs_bundled_separately':'SENTRA_PNPK_72_ORIGINAL_SOURCE_PDFS.zip','clinical_semantic_qa':'REQUIRES_HUMAN_REVIEW'})
(D/'source_parser_qa_results.json').write_text(json.dumps(qa,ensure_ascii=False,indent=2)+'\n')
(D/'README.md').write_text(f'''# Sentra Clinical Core — Source Parser V2 (QA Gated)\n\n**Source reparse: COMPLETE (72/72 PDFs). Clinical curation for the 72: NOT COMPLETE.**\n\n80 source PDFs recovered. 72 newly reprocessed PDFs generated 8,332 PDF-page text records and **904 machine-selected literal source excerpts**. Previous 8-PNPK clinical facts (182) are preserved. Each machine candidate has a validated exact quote-to-page text match, source filename/Drive ID, PDF page, SHA-256 and source-text offsets.\n\n**Safety:** Automated section/candidate classification has false-positive clinical semantics (found in spot-checks). To prevent erroneous clinical field assignment, all `definisi/gejala/diagnosis/terapi/rujukan` fields of these 72 records are explicitly unavailable until reviewed. Machine candidates remain only in `source_extraction_candidates`, source evidence JSONL, and separate SQLite tables. These are not clinician-approved facts, and are excluded from clinical retrieval.\n\nThis is a **source parser repair with source-level provenance and semantic quarantine**, not a certification of clinical accuracy across 72 guidelines.\n\nFiles:\n- `knowledge_base/json` and `markdown`: all 144 records, status-safe.\n- `evidence/source_pages.jsonl`: 8,332 indexed original PDF-page extracts.\n- `evidence/source_evidence_candidates.jsonl`: 904 machine evidence candidates (exact text and page anchors).\n- `evidence/clinical_review_queue.csv`: triage candidates by topic and section-mixing risks.\n- `sentra_clinical_core_source_reparsed.sqlite`: previous curated database + separate non-promoted source tables.\n- `source_inventory.json`: every new source and SHA-256 / Drive URL.\n- `tools`: deterministic parser and fail-closed QA finalizer.\n- `checksums/`: original untouched local ZIP and V1 repaired checkpoint.\n\n72 original PDFs are separately archived as `SENTRA_PNPK_72_ORIGINAL_SOURCE_PDFS.zip` (not included inside core ZIP to avoid duplication). The other 8 source PDFs exist in V1 repaired checkpoint.\n\n**Outstanding:** per-document semantic clinical curation and table/figure visual verification (116 page extracts with sparse text) and clinician attestation. Regulatory applicability is UNVERIFIED for the new 72. Never auto-generate a diagnosis or treatment from unreviewed candidates.\n\nArchitect & Build by dr. Ferdi Iskandar (the Gaffer) — Sentra Artificial Intelligence.\n''',encoding='utf-8')
qa_md=f'''# Final Source Parser QA Report — V2 (72 PNPK)\n\n## Verified technical results\n\n| Metric | Result |\n|---|---:|\n| New original PDFs matched and SHA-256 checked | 72/72 PASS |\n| Old PDF sources from V1 retained | 8 |\n| Source PDF pages parsed | 8,332 |\n| Exact source-anchored machine candidate excerpts | 904 |\n| Evidence quote-to-page offset verified | 904/904 PASS |\n| Record JSON and Markdown files | 144 + 144 |\n| Previous curated clinical facts preserved | 182/182 PASS |\n| Previous curated documents and pages preserved | 8 docs / 710 pages |\n| New source documents indexed | 72 |\n| FTS disease query smoke tests | {sum(t['pass'] for t in qa['tests'])}/{len(qa['tests'])} PASS |\n| SQLite integrity & foreign key check | PASS / PASS |\n| Source parser automatic clinical-field promotion | BLOCKED / PASS |\n| Raw extraction requiring PDF visual review | 116 sparse-text pages |\n| Clinician semantic approval | NOT PERFORMED |\n\n## Why the safety gate is mandatory\n\nSpot checks of the first source extraction identified several **wrong section-to-field associations** despite correct literal PDF anchors, e.g.:\n\n- Pneumonia: a prevalence statistic was selected by the naive definition heuristic.\n- Anesthesiology: an appendix-related symptom sentence from the same guideline was selected as a generic symptom candidate.\n- Childhood leukemia: supportive treatment language was initially classified as symptoms.\n- Chronic kidney disease: introductory text was initially selected as a definition.\n\nAll top-level clinical fields for the 72 remain explicitly missing and are not eligible for clinical retrieval; these excerpts are retained **only in the review queue** for source-specific evaluation. Exact string matching is necessary but insufficient for clinical meaning or appropriateness.\n\n## Machine triage flags\n\n''' + '\n'.join(f'- {k}: {v}' for k,v in sorted(overlap.items()))+'''\n\n## Final scope\n\n**COMPLETE:** source retrieval, independent PDF text parsing, per-page provenance, document mapping, exact anchor validation, isolated SQLite/FTS, machine candidate queue, safe-field quarantine.\n\n**NOT COMPLETE:** 72/72 independent clinical semantic curation, table/figure visual review, active-regulation certification, and clinician approval. Do not use machine candidates as clinical recommendations.\n'''
(D/'QA_REPORT.md').write_text(qa_md,encoding='utf-8')
out=R/'SENTRA_KNOWLEDGE_BASE_SOURCE_PARSER_V2_72PNPK_QA_GATED.zip'
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED,compresslevel=6,allowZip64=True) as z:
 for x in sorted(D.rglob('*')):
  if x.is_file():z.write(x,x.relative_to(D))
with zipfile.ZipFile(out) as z:
 assert z.testzip() is None
 assert len([x for x in z.namelist() if x.startswith('knowledge_base/json/') and x.endswith('.json')])==144
 assert len([x for x in z.namelist() if x.startswith('knowledge_base/markdown/') and x.endswith('.md')])==144
print('FINAL_V2_QA_GATED',json.dumps({'original_PNPK_source_pdfs':80,'reparsed_source_documents':72,'pages':8332,'source_anchored_candidates':904,'exact_anchor_verification':'904/904 PASS','semantic_triage_flags':dict(overlap),'existing_clinical_facts':182,'clinical_candidate_promotion':'BLOCKED_72_OF_72','all_144_current_retrieval_disabled':True,'zip_bytes':out.stat().st_size,'zip_crc':'PASS'},ensure_ascii=False))
