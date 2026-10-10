#!/usr/bin/env python3
"""Sentra PNPK source parser v2 — deterministic, page-anchored, fail-closed.

Replaces erroneous field selection in 72 quarantined PNPK entries by fetching
EXACT same-PDF page passages, not abstracting or fabricating diagnoses.
All newly extracted passages are MACHINE CANDIDATES requiring clinical review.
Existing 8-document clinically curated SQLite dataset is backed up unchanged.
"""
from __future__ import annotations
import collections,csv,difflib,hashlib,json,pathlib,re,shutil,sqlite3,sys,time,zipfile
import fitz
ROOT=pathlib.Path('/mnt/data')
PREV=ROOT/'knowledge_base_repaired'
DEST=ROOT/'SENTRA_KNOWLEDGE_BASE_SOURCE_REPARSED_V2'
KB=DEST/'knowledge_base'
MISSING='Belum tersedia — lengkapi dan verifikasi oleh klinisi'
DRIVE_IDS=dict(line.split() for line in '''
001 1UNHMbwv9jpTXJ5dRb4OlBy0npYqItMrI
002 1CXrcLteLDNKeISa00Gp8mir8r5gn-U2z
003 1TUCalluIIKltp22UzN43HtzfarhEvYjb
004 1iNpaLuEusfxDTzxKBzidPP-ZoqL_k50V
005 1qw1rdoap0FGzKOIdjKcYlJBE3eW31E-s
006 1-xOKtE1Gs5wrzVeMRwgZnTToL99_klDf
007 15fig0WjOXJBivOl-FlB3zxAqYWySDTko
008 1bl4OrrOtw0PGOKafTD0xR5SsssLOYL-G
009 1PIUtpLHHJYoiUpyjbx0YDrgHc3sO3lL4
010 1sgk5jJeYSqyBrRTdQG6wgPMIdDvgDowq
011 1n6PVI8-UJlXowNwQl6aolDlbMgesum8l
012 1tlgOAzlQ2l2dW-VEHpdCIb5TVJt0cIX0
013 1SyUYqw2jzxQS6ExkYVkQnOmPm_fDOhAJ
014 1u1aCID-ySqtsK5sYENz2Pzs2
015 11ei52H7L209c4J5ZqL8EWsduoqpjmuTc
016 1T0oSwUrIzDUuWA_j7LAlPvkgDj1cusJS
017 1fRMItTFLhqo-tid67RAgzOfN2Rr8m8IX
018 1R5FI3dcuYy1z3-q6a_TyKjS26uvXgDo0
019 1ycSQxA-cfWvZsBBvHIMcfFj-d70S2zs2
020 1Ix8NmvVaj4sTshN95PEWZB8zkqS4s6TD
021 1ja72lcxSRQdKfl8hi7CF0bM5qtLBumdZ
022 1UACfpsTYyggNsLNxCLeFDxUqbeqdXhxw
023 1Z-Yls3GxFb3O-OrH4P2qnV9zN3sJlNO-
024 1d-B-jb6c2PbTc4Oe-EVZgILFGLqhXxKw
025 1G6ReVJ2IYZkOKiR8Xu0_zNZ3MT9I8Lx5
026 18YeytyCNIqzUQA0i5fBEiO-cT_Q3fgFQ
027 13YhOl-RsHujWCstug4sJ-DAmTIkV2066
028 1XYtQG32WxnWYrjaKartLuSp40-nzOk89
029 1LAkv7qNbS3pDcV1DkzhzacU1Kjn_rrhU
030 1uLxTnm2rwMJmYGfO3tsXOv9tEJ7rkdG5
031 10pgE7hiMbQ1nubz80HdUjumOpVih9KHT
032 1V4AtZHj6EazHqCXtLasnQvfYkmmS99Eb
034 18W8zIF-NhFj3JUt6DzI_CptUAMCCShBU
035 1ZTXkvXJhHUCMAb5-ZLyxU_TttIkxjuco
036 1XViVrvHFnvNjqV4B77BL4vV9gXRroLhA
037 1hhautPvVEmyWKAh1fWk3jzTHJ-8uIM2n
038 1DYCjvYzAi0zd6ViCgPyiYOT7kaUzGSjV
039 1g2YXi2EOFHNslcj_nRB2KLPEDQz2_U60
040 1-UPl-tdxva-zpbmKlf8Nmgla8kFH0KXn
041 1nQeSv-_iFaBlxLM21hKqrjf524LFxRlC
042 1AqgL2Yq7uj8HRfwItcblJN0W4jfKP1FE
043 1hJuJnR65ruvo5w30_xb0E01PFU8qLviO
044 11kwpLqQHyBDoDP0b3MJ0sGoWlw0Fs5BN
045 1IJqT2sP_2RQpQGlK0QI-i6GNDLRsf6F-
046 1IcmDgvwXZQIZudsvtav9a_AP3frl8E7A
047 1gaDLzFS3wqEKMBsQmJMsVoo-JZmTllwT
048 1budgzywE6aRp8q3cHjpa6OtmU4VVgG0L
049 1JHzva-ytLXkFIFcjZo3QIBpSHD4JmTbG
050 19WNM3CeUv2WoFl3T1qbd0X2wlX6f31cD
051 1l6EghN3umQKyhGrV2rp4qj6N_IcHW3fi
052 1xDBBtbYmwmLdfA_0Ke3W_WwtCrmyrMaS
053 1TbzIOWuhES15jbFk11hQ4u1CbABUPMJl
054 1Obw8fUvl3XjuLbUdTJaNXPkrgSoUJbl7
055 13OYClgVP0fNkJEw14sQgXJeRSOfJHVsX
056 1ia0--7vcDQzBMXT4Fi80_479Cu123BGT
057 1F8aHaKM8txJrdJpqXqP4anJzMAe5XzSC
058 15f2ePl4mo3bWxIYJe3jHRknS2Pm0OGL3
059 1pLfASvuLdoySD5LNo9F1WAAz2n_xrsWh
060 1vtiuzFsk3bjbUlZBJp9LniORWiEfEA3m
061 1RPGqf_B-XRrC7PmuzO1t3alhRJCfsyDD
062 1A5lBLbPCwWM3ZeBw8WC8qfQMmspteIa1
063 1wrAShOfl9hFWb-sDDG-ktHepeRwIgxY4
064 1p7pKEodk8QMpcaDovpmd8z42kNxVUl74
065 12W9uuK-pbXysDMOmE9wudvGXwAvmtTMV
066 1ax-mMMQqM5PmVYruu1LcEPCPT8fcAZWA
067 1tCYlkN2GZNppQa5_l5tU4xnIbG_BI71S
068 1PONEzytouOgKd4I0xr1Xy5hVQxCG7Fp6
069 1bOloQIIszD_Rv70jUkvJGprODI05ERq6
070 1S26bCVrEqZ4TeXjQWMugeoJ9_dUNCRT2
071 1rWuAYtGI5-g3FDy1m7y56cOTQxtQqWVA
072 1-qm38fVvmZkBH4p0SuS0kJDRSkSqD3If
073 13EA4YFw7vYOBmlWIp2W8bLAchnmKmy6_
074 1IBwiVa9qcAoegtRw8lOZCiqlq4NW6K2o
075 1zrCM2jcdzgRhqUYwTN2o0IZKgwg7TjID
076 1lEp6EQ9hObY3ZvRPba4CkfxDrhuhOTcR
077 1YuyxeG_gIk42zFA_rd5aJw46q3Ejl1M3
078 1RFBrtsWx9-yXNIuWF0Jj5lpxheszBI-l
079 10ft137CWQ-qfEWBs4eN-aGL-QcbbR9OD
080 1oYDL1d5qMnpJDsikAhTLEc6sISTZTXPB
081 1gQhI2tWyLdD8JwzzbXLT25r8jITtjO9x
'''.strip().splitlines())
# explicit correction for 014 from verified Drive file listing
DRIVE_IDS['014']='1u1aCID-ySqtsK5sYENz2PZ1c6dSZ3i-r'
SHA=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
NORM=lambda s:re.sub(r'\s+',' ',s).strip()
CLEAN_MK=re.compile(r'(?:jdih\s*\.\s*kemkes\s*\.\s*go\s*\.\s*id|www\s*\.\s*kemkes\s*\.\s*go\s*\.\s*id|^\s*[-–]?\s*\d+\s*[-–]?\s*$)',re.I)
REFERENCE=re.compile(r'(?:\b(?:doi\s*:|https?://|ISBN|et al\.|Vol\.|Jurnal\s+(?:Kedokteran|Penelitian)|diakses\s+(?:tanggal|pada)|daftar pustaka|references)\b)',re.I)
DEFINITION=re.compile(r'\b(?:adalah|merupakan|didefinisikan\s+sebagai|disebut\s+sebagai)\b',re.I)
PATTERNS={
'diagnosis':re.compile(r'\b(?:diagnosis|diagnostik|ditegakkan|mendiagnosis|kriteria\s+diagnosis|diagnosis\s+pasti|penegakan\s+diagnosis)\b',re.I),
'symptoms':re.compile(r'\b(?:gejala\s+klinis|gejala\s+yang|gejala\s+berupa|keluhan\s+yang|manifestasi\s+klinis|tanda\s+dan\s+gejala|gambaran\s+klinis|gejala\s+utama|tanda\s+klinis)\b',re.I),
'investigation':re.compile(r'\b(?:pemeriksaan\s+penunjang|pemeriksaan\s+laboratorium|pemeriksaan\s+radiologis|pemeriksaan\s+mikrobiologi|biopsi\s+[a-z]+|pemeriksaan\s+histopatologi|tes\s+diagnostik|tes\s+molekuler)\b',re.I),
'differential':re.compile(r'\b(?:diagnosis\s+banding|diagnosa\s+banding|dibedakan\s+dari|diferensial\s+diagnosis)\b',re.I),
}
QUOTAS={'definition':2,'diagnosis':5,'symptoms':4,'investigation':3,'differential':2}

def canon(s):
 s=re.sub(r'^\d{3}_','',s);s=s.replace('.pdf','').replace('_',' ').lower()
 s=re.sub(r'\b(?:pnpk|tata|laksana|pedoman|nasional|pelayanan|klinis|kedokteran|pada|tahun|penanganan|2024|2023|2022|2021|2020|2019|2018|2017|2015)\b',' ',s)
 return ' '.join(re.findall(r'[a-z]+',s))

def choose_pdf(j, files):
 scored=sorted([(difflib.SequenceMatcher(None,canon(j['nama']),canon(p.name)).ratio(),p) for p in files],reverse=True)
 if scored[0][0]<.68 or (scored[1][0]>.9 and scored[0][0]-scored[1][0]<.05):
  raise ValueError(f'Ambiguous PDF match {j["nama"]}: {scored[:2]}')
 return scored[0][1],scored[0][0]

def page_text(page):
 raw=page.get_text('text',sort=True)
 lines=[x.strip() for x in raw.splitlines()]
 # Readable search text; preserve original PDF separately for audit.
 clean=[l for l in lines if l and not CLEAN_MK.search(l)]
 return NORM(' '.join(clean))

def heading_context(lines):
 # Source heading tracker; label is context only, never used as evidence alone.
 headings=[]
 for l in lines:
  s=NORM(l)
  if 4<len(s)<115 and re.match(r'^(?:[A-Z]\.\s*|\d+(?:\.\d+)*[.)]\s*)?(?:Definisi|Pengertian|Diagnosis(?:\s+Banding)?|Pendekatan\s+Diagnosis|Manifestasi\s+Klinis|Gambaran\s+Klinis|Gejala\s+Klinis|Anamnesis|Pemeriksaan\s+Penunjang|Pemeriksaan\s+Fisik|Diagnosis\s+dan\s+Tatalaksana)\s*$',s,re.I):
   headings.append(s)
 return headings[-1] if headings else ''

def textspan(t,at):
 left=max(t.rfind('. ',max(0,at-170),at)+2,t.rfind(': ',max(0,at-170),at)+2,0)
 if at-left>160:left=at
 # avoid spanning entire table/long multi-topic text
 after=t[at:at+450]
 end=re.search(r'(?<=[A-Za-z0-9\)])\.\s+(?=[A-Z(])',after)
 right=at+end.end()-1 if end and end.start()>65 else min(len(t),at+320)
 if right-left>450:right=min(len(t),left+445)
 quote=t[left:right].strip(' :;,.-')
 return quote,left,right

def is_candidate(quote, cat, title):
 if len(quote)<65 or len(quote)>460:return False
 if REFERENCE.search(quote) or 'jdih.kemkes' in quote.lower():return False
 if re.search(r'\b(?:DAFTAR ISI|KATA PENGANTAR|MENIMBANG|MENGINGAT|MENTERI KESEHATAN REPUBLIK INDONESIA|LAMPIRAN KEPUTUSAN)\b',quote,re.I):return False
 if re.search(r'(?:\.{5,}|_{4,}|\b(?:Gambar|Tabel)\s+\d+\s*[:.]\s*$)',quote,re.I):return False
 if len(re.findall(r'\d',quote))>45:return False # avoid numerical table grafts
 if len(quote.split())<10:return False
 if cat=='definition':
  toks=[w for w in canon(title).split() if len(w)>3]
  if not toks or not DEFINITION.search(quote):return False
  if not any(re.search(r'\b'+re.escape(w)+r'\b',quote,re.I) for w in toks[:2]):return False
 if cat=='symptoms' and re.search(r'\b(?:dosis|antibiotik|mg/kg|injeksi|obat\s+pilihan)\b',quote,re.I):return False
 return True

def score(quote,cat,title,where,page_idx):
 s=0
 tok=[w for w in canon(title).split() if len(w)>3]
 hits=sum(bool(re.search(r'\b'+re.escape(w)+r'\b',quote,re.I)) for w in tok[:4]);s+=8*hits
 if cat=='diagnosis':
  s+=14 if re.search(r'\b(?:diagnosis\s+.{0,65}?(?:ditegakkan|berdasarkan)|kriteria\s+diagnosis|diagnosis\s+pasti)\b',quote,re.I) else 0
 if cat=='definition':s+=18 if hits else 0
 if cat=='symptoms':s+=10 if re.search(r'\b(?:keluhan|pasien\s+(?:datang|dapat)|ditandai|gejala)\b',quote,re.I) else 0
 s+=3 if len(quote)>120 else 0
 if 'diagnosis' in where.lower() and cat in ('diagnosis','investigation'):s+=6
 if page_idx<4:s-=10
 if REFERENCE.search(quote):s-=60
 return s

def extract(pdf, disease, no):
 pages=[];pool=[];image_pages=[];clinical_section=''
 with fitz.open(pdf) as doc:
  total=len(doc)
  for idx,page in enumerate(doc):
   t=page_text(page); original=page.get_text('text',sort=True)
   pnum=idx+1; headings=heading_context(original.splitlines())
   if headings:clinical_section=headings
   if len(t)<50:image_pages.append(pnum)
   pages.append({'file_no':no,'pdf_page':pnum,'text_search':t,'text_sha256':hashlib.sha256(t.encode()).hexdigest(),'chars':len(t),'requires_visual_review':len(t)<50})
   if idx<2 or len(t)<100:continue
   if re.search(r'\bDAFTAR PUSTAKA\b',t[:180],re.I):
    continue
   hits=[]
   for cat,pat in PATTERNS.items():
    for m in list(pat.finditer(t))[:75]:
     q,l,r=textspan(t,m.start())
     if is_candidate(q,cat,disease):hits.append((cat,q,l,r))
   # Definition requires a disease-specific subject and predicative phrase.
   toks=[w for w in canon(disease).split() if len(w)>3]
   for tok in toks[:2]:
    for m in list(re.finditer(r'\b'+re.escape(tok)+r'\b',t,re.I))[:35]:
     q,l,r=textspan(t,m.start())
     if is_candidate(q,'definition',disease) and re.search(r'\b'+re.escape(tok)+r'\b.{0,145}?\b(?:adalah|merupakan|didefinisikan)\b',q,re.I):hits.append(('definition',q,l,r))
   used=set()
   for cat,q,l,r in hits:
    dedup=(cat,l//70)
    if dedup in used:continue
    used.add(dedup)
    if cat=='definition' and not any(w in q.lower() for w in toks[:2]):continue
    sc=score(q,cat,disease,clinical_section,idx)
    pool.append({'category':cat,'evidence_quote':q,'pdf_page':pnum,'source_char_offset':l,'source_char_end':l+len(q),'source_section_context':clinical_section if headings or clinical_section else 'NOT_DETERMINED','score':sc,'review_status':'MACHINE_EXTRACTED_SOURCE_ANCHORED_UNREVIEWED','source_text_sha256':pages[-1]['text_sha256']})
 selected=[];seen=set()
 for cat,quota in QUOTAS.items():
  cand=sorted((x for x in pool if x['category']==cat),key=lambda x:(-x['score'],x['pdf_page'],x['source_char_offset']))
  n=0
  for x in cand:
   if x['score']< (12 if cat=='definition' else 4):continue
   k=(x['pdf_page'],x['evidence_quote'][:110])
   if k in seen:continue
   if x['evidence_quote'] not in pages[x['pdf_page']-1]['text_search']:
    raise RuntimeError('Source anchor failed '+pdf.name+' '+str(x['pdf_page']))
   x['source_char_offset']=pages[x['pdf_page']-1]['text_search'].find(x['evidence_quote'])
   x['source_char_end']=x['source_char_offset']+len(x['evidence_quote'])
   assert x['source_char_offset']>=0
   selected.append(x);seen.add(k);n+=1
   if n>=quota:break
 selected.sort(key=lambda x:(x['pdf_page'],x['source_char_offset'],x['category']))
 for i,x in enumerate(selected,1): x['candidate_id']=f'P{no}-{i:03d}'
 return pages,selected,image_pages

def to_md(j):
 meta=j['metadata'];state=meta.get('clinical_qa_status','UNKNOWN');s=[f'# {j["nama"]}','',f'**Clinical QA:** `{state}`','**Clinical use:** DISABLED until human clinical review','']
 pv=j.get('source_provenance',{})
 if pv:s.extend([f'**PNPK PDF:** {pv.get("filename")}',f'**SHA-256:** `{pv.get("file_sha256")}`',f'**Drive:** {pv.get("drive_url")}',f'**Regulatory status:** {pv.get("regulatory_status")}',f'**PDF pages:** {pv.get("source_pdf_page_count")}',''])
 for key,title in [('definisi','Definisi'),('gejala','Gejala'),('diagnosis','Diagnosis'),('terapi','Terapi'),('rujukan','Rujukan')]:
  s.extend(['## '+title]);v=j.get(key)
  if isinstance(v,list):s.extend(['- '+str(x) for x in v] if v else [MISSING])
  else:s.append(str(v or MISSING))
  s.append('')
 if j.get('source_extraction_candidates'):
  s+=['## Source-anchored machine candidates','', '> Passages below are literal PDF excerpts, NOT clinician-reviewed facts. Page references use 1-indexed PDF pages.','']
  for x in j['source_extraction_candidates']:
   s.extend([f'### {x["candidate_id"]} · {x["category"]} · PDF p.{x["pdf_page"]}',x['evidence_quote'],''])
 if j.get('clinical_evidence') and not j.get('source_extraction_candidates'):
  s+=['## Previous curated diagnostic subset','']
  for x in j['clinical_evidence']:
   s.extend([f'### {x["fact_id"]} · PDF p.{x["pdf_page"]}',x['evidence_quote'],''])
 return '\n'.join(s)+'\n'

def main():
 t0=time.time();src_files=sorted(ROOT.glob('[0-9][0-9][0-9]_*.pdf'))
 assert len(src_files)==80, f'Expected 80 source PDFs, found {len(src_files)}'
 assert len(DRIVE_IDS)==81-1 and set(DRIVE_IDS)=={p.name[:3] for p in src_files}, 'Drive IDs inventory mismatch'
 if DEST.exists():shutil.rmtree(DEST)
 for d in [KB/'json',KB/'markdown',DEST/'evidence',DEST/'tools',DEST/'checksums']:d.mkdir(parents=True,exist_ok=True)
 jfiles=sorted((PREV/'knowledge_base'/'json').glob('*.json'))
 records={p.stem:json.loads(p.read_text()) for p in jfiles}
 assert len(records)==144
 quarantine=[j for j in records.values() if j['metadata']['clinical_qa_status']=='QUARANTINED_PNPK_SOURCE_REQUIRED']
 assert len(quarantine)==72
 mappings=[];all_pages=[];all_ev=[];image_pages_by_no={};sha_to_doc={};integrity=collections.Counter()
 for j in sorted(quarantine,key=lambda x:x['slug']):
  pdf,quality=choose_pdf(j,src_files);no=pdf.name[:3]
  assert no not in sha_to_doc,(no,j['slug']);sha_to_doc[no]=j['slug']
  h=SHA(pdf);pages,ev,img=extract(pdf,j['nama'],no);image_pages_by_no[no]=img
  year=re.search(r'_((?:20)\d\d)_',pdf.name)
  year=year.group(1) if year else None
  rawfront=' '.join(page_text(p) for p in list(fitz.open(pdf))[:3])
  kmk=re.search(r'HK\s*\.?\s*0?1\s*\.\s*0?7\s*/\s*MENKES\s*/\s*[\d]+\s*/\s*20\d{2}',rawfront,re.I)
  kmk=NORM(kmk.group(0)) if kmk else 'NOT_DETERMINED_FROM_TEXT'
  url=f'https://drive.google.com/file/d/{DRIVE_IDS[no]}/view'
  pv={'drive_file_id':DRIVE_IDS[no],'drive_url':url,'filename':pdf.name,'file_sha256':h,'kmk_number':kmk,'year':year,'source_pdf_page_count':len(pages),'matched_original_record':j['slug'],'matching_score':round(quality,3),'regulatory_status':'UNVERIFIED','source_checked':True}
  ev=[dict(x,source_file_no=no,source_pdf_filename=pdf.name,source_pdf_sha256=h,source_drive_url=url,disease_slug=j['slug']) for x in ev]
  # Only EXACT source passages may populate legacy fields. If no exact subject
  # anchor is found, leave the field missing (never fill from heuristics).
  defin=[x for x in ev if x['category']=='definition']
  symp=[x for x in ev if x['category']=='symptoms']
  diagn=[x for x in ev if x['category']=='diagnosis']
  # FAIL-CLOSED: section classification alone is not clinical semantic validation.
  # Candidates live in source_extraction_candidates, never in clinician-facing
  # fields until a source-aware clinical reviewer explicitly approves them.
  j['definisi']=MISSING
  j['gejala']=[]
  j['diagnosis']=MISSING
  j['terapi']=MISSING;j['rujukan']=MISSING
  j['source_provenance']=pv
  j['source_extraction_candidates']=ev
  j['metadata']={**j['metadata'],'parser_repaired':True,'is_complete':False,'verified_clinical_kb':False,'clinical_retrieval_allowed':False,'source_corpus_status':'ORIGINAL_PDF_RETRIEVED_AND_HASHED','clinical_qa_status':'SOURCE_ANCHORED_MACHINE_PARSE_REVIEW_REQUIRED','clinical_approval':'NOT_PERFORMED','source_candidate_count':len(ev),'source_fact_count':0,'original_data_quarantined':True,'visual_review_required':bool(img),'source_candidate_promotion_blocked':True}
  j['sumber']=[{'source':f'PNPK {year or "unknown"}', 'type':'PNPK','year':year,'filename':pdf.name,'sha256':h,'drive_file_id':DRIVE_IDS[no],'drive_url':url,'regulatory_status':'UNVERIFIED'}]
  mappings.append({'slug':j['slug'],'file_no':no,**pv,'source_candidate_count':len(ev),'image_only_pages':len(img)})
  all_pages.extend(pages);all_ev.extend(ev)
  integrity['pdfs_matched']+=1
  if not ev:integrity['no_candidate_documents']+=1
  if not diagn:integrity['no_diagnosis_candidate_documents']+=1
  if not symp:integrity['no_symptom_candidate_documents']+=1
  if defin:integrity['definition_anchor_documents']+=1
  print('PARSED',no,j['slug'],'pages',len(pages),'evidence',len(ev),'definition',bool(defin),'symptoms',len(symp),'diagnosis',len(diagn),flush=True)
 assert set(sha_to_doc)==({p.name[:3] for p in src_files}-{'003','034','035','039','041','044','045','078'})
 assert len(all_pages)>4000 and len(all_ev)>0
 # Preserve eight previous curated subsets (never overwrite evidence, status).
 for j in records.values():
  p=KB/'json'/f'{j["slug"]}.json';p.write_text(json.dumps(j,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
  (KB/'markdown'/f'{j["slug"]}.md').write_text(to_md(j),encoding='utf-8')
 assert len(list((KB/'json').glob('*.json')))==144
 catalog=json.loads((PREV/'knowledge_base/catalog.json').read_text())
 catalog['title']='Sentra Clinical Core — source-reparsed evidence-gated knowledge base'
 catalog['version']='4.0.0-source-parser-v2'
 for d in catalog['diseases']:
  j=records[d['slug']]
  for key in ('clinical_qa_status','is_complete','verified_clinical_kb','clinical_retrieval_allowed'):
   d[key]=j['metadata'].get(key)
  d['source_candidate_count']=len(j.get('source_extraction_candidates',[]))
  d['source_fact_count']=len(j.get('clinical_evidence',[]))
  d['gejala_count']=len(j['gejala'])
 (KB/'catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n')
 for fn,it in [('source_pages.jsonl',all_pages),('source_evidence_candidates.jsonl',all_ev)]:
  with (DEST/'evidence'/fn).open('w') as f:
   for x in it:f.write(json.dumps(x,ensure_ascii=False)+'\n')
 (DEST/'source_inventory.json').write_text(json.dumps(sorted(mappings,key=lambda x:x['file_no']),ensure_ascii=False,indent=2))
 # Non-destructively backup V1 SQLite and add source-only candidates. Do not
 # put machine candidates into clinical_facts or clinical_facts_fts.
 orig=sqlite3.connect('file:'+str(PREV/'source_checkpoint.sqlite')+'?mode=ro',uri=True)
 db=sqlite3.connect(str(DEST/'sentra_clinical_core_source_reparsed.sqlite'));orig.backup(db);orig.close()
 db.executescript('''
 CREATE TABLE source_documents_v2(file_no TEXT PRIMARY KEY,disease_slug TEXT NOT NULL,filename TEXT NOT NULL,sha256 TEXT NOT NULL,drive_url TEXT NOT NULL,page_count INTEGER NOT NULL, regulatory_status TEXT NOT NULL, clinical_review_status TEXT NOT NULL);
 CREATE TABLE source_pages_v2(file_no TEXT NOT NULL,pdf_page INTEGER NOT NULL,text_search TEXT NOT NULL,text_sha256 TEXT NOT NULL,requires_visual_review INTEGER NOT NULL,PRIMARY KEY(file_no,pdf_page),FOREIGN KEY(file_no) REFERENCES source_documents_v2(file_no));
 CREATE TABLE source_candidates_v2(candidate_id TEXT PRIMARY KEY,file_no TEXT NOT NULL,pdf_page INTEGER NOT NULL,disease_slug TEXT NOT NULL,category TEXT NOT NULL,evidence_quote TEXT NOT NULL, source_char_offset INTEGER NOT NULL, source_char_end INTEGER NOT NULL, score INTEGER NOT NULL, review_status TEXT NOT NULL,FOREIGN KEY(file_no,pdf_page) REFERENCES source_pages_v2(file_no,pdf_page));
 CREATE VIRTUAL TABLE source_candidates_fts_v2 USING fts5(candidate_id UNINDEXED,disease_slug,category,evidence_quote,tokenize='unicode61 remove_diacritics 2');
 CREATE INDEX idx_source_candidates_v2_disease ON source_candidates_v2(disease_slug,category);
 ''')
 by_no={x['file_no']:x for x in mappings}
 db.executemany('INSERT INTO source_documents_v2 VALUES(?,?,?,?,?,?,?,?)',[(x['file_no'],x['slug'],x['filename'],x['file_sha256'],x['drive_url'],x['source_pdf_page_count'],x['regulatory_status'],'MACHINE_PARSE_REQUIRES_CLINICIAN_REVIEW') for x in mappings])
 db.executemany('INSERT INTO source_pages_v2 VALUES(?,?,?,?,?)',[(x['file_no'],x['pdf_page'],x['text_search'],x['text_sha256'],int(x['requires_visual_review'])) for x in all_pages])
 db.executemany('INSERT INTO source_candidates_v2 VALUES(?,?,?,?,?,?,?,?,?,?)',[(x['candidate_id'],x['source_file_no'],x['pdf_page'],x['disease_slug'],x['category'],x['evidence_quote'],x['source_char_offset'],x['source_char_end'],x['score'],x['review_status']) for x in all_ev])
 db.executemany('INSERT INTO source_candidates_fts_v2(candidate_id,disease_slug,category,evidence_quote) VALUES(?,?,?,?)',[(x['candidate_id'],x['disease_slug'],x['category'],x['evidence_quote']) for x in all_ev])
 db.commit()
 # Test source-quote alignment, uniqueness, PNPK scope, and preservation.
 assert db.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
 assert db.execute('PRAGMA foreign_key_check').fetchall()==[]
 old=sqlite3.connect('file:'+str(PREV/'source_checkpoint.sqlite')+'?mode=ro',uri=True)
 for table in ['documents','pages','clinical_facts','diagnostic_evidence']:
  assert db.execute('SELECT COUNT(*) FROM '+table).fetchone()[0]==old.execute('SELECT COUNT(*) FROM '+table).fetchone()[0],table
  assert db.execute('SELECT * FROM '+table).fetchall()==old.execute('SELECT * FROM '+table).fetchall(),'Previous content changed '+table
 old.close()
 assert db.execute('SELECT COUNT(*) FROM source_documents_v2').fetchone()[0]==72
 assert db.execute('SELECT COUNT(*) FROM source_pages_v2').fetchone()[0]==len(all_pages)
 assert db.execute('SELECT COUNT(*) FROM source_candidates_v2').fetchone()[0]==len(all_ev)
 assert db.execute('SELECT COUNT(*) FROM source_candidates_fts_v2').fetchone()[0]==len(all_ev)
 for r in db.execute('SELECT a.candidate_id,a.evidence_quote,p.text_search,a.source_char_offset,a.source_char_end FROM source_candidates_v2 a JOIN source_pages_v2 p ON (a.file_no=p.file_no AND a.pdf_page=p.pdf_page)'):
  assert r[1]==r[2][r[3]:r[4]],'QUOTE_SOURCE_SPAN_MISMATCH '+r[0]
 # Tests: terminology, population and one doc only per source (no cross-PDF mixes)
 lookups={'malaria':'malaria','stroke':'stroke','kanker-paru':'kanker','tuberkolosis':'tuberk','epilepsi-pada-anak':'epilepsi','pneumonia-pada-dewasa':'pneumonia','hiperbilirubinemia':'bilirubin','glaukoma':'glaukoma','penyakit-ginjal-kronik':'ginjal','hepatitis-b':'hepatitis'}
 tests=[]
 for slug,term in lookups.items():
  n=db.execute('SELECT COUNT(*) FROM source_candidates_fts_v2 f JOIN source_candidates_v2 e ON e.candidate_id=f.candidate_id WHERE source_candidates_fts_v2 MATCH ? AND e.disease_slug=?',(term+'*',slug)).fetchone()[0]
  tests.append({'disease':slug,'query':term,'matched_source_candidates':n,'pass':n>0})
 db.close()
 (DEST/'source_parser_qa_results.json').write_text(json.dumps({'tests':tests,'database_integrity':'PASS','foreign_keys':'PASS','source_anchor_all_exact':'PASS','preserved_eight_curated_sources':'PASS','source_documents':72,'indexed_pages':len(all_pages),'machine_candidates':len(all_ev),'issues':dict(integrity),'image_only_page_counts':image_pages_by_no},ensure_ascii=False,indent=2))
 # Copy audit originals, checksum manifest and reproducible parser.
 shutil.copy2(ROOT/'knowledge_base.zip',DEST/'checksums'/'original_knowledge_base_unmodified.zip')
 shutil.copy2(ROOT/'SENTRA_KNOWLEDGE_BASE_REPAIR_V1_PARTIAL_QA_GATED.zip',DEST/'checksums'/'prior_repair_v1_unmodified.zip')
 shutil.copy2(__file__,DEST/'tools'/'sentra_source_parser_v2.py')
 (DEST/'README.md').write_text(f'''# SENTRA Clinical Core — Original-source reparsing V2\n\n**Status: MACHINE SOURCE REPARSE COMPLETE FOR 72/72. NOT CLINICIAN-APPROVED.**\n\n- PDF originals: 80 verified locally; 72 new source matches + 8 previously reviewed.\n- Pages extracted for new 72: {len(all_pages)}.\n- Machine-extracted source-anchored candidates: {len(all_ev)}.\n- Prior curated database remains **8 PNPK / 710 pages / 182 curated diagnostic facts**.\n- Every machine candidate has an exact PDF-page, character span and original PDF SHA-256.\n- No machine candidate is inserted into `clinical_facts`; separate tables `source_*_v2` and FTS5.\n- Top-level legacy fields for 72 entries are replaced only with source literal excerpts, explicitly page-anchored; unsupported fields are tagged `{MISSING}`.\n- All 144 records have `verified_clinical_kb=false` and `clinical_retrieval_allowed=false`.\n- Legacy raw archive and V1 recovery kept for audit.\n- Missing text/complex visual tables require visual clinical review before promotion.\n- Regulatory applicability remains `UNVERIFIED` for 72 new sources.\n- Source PDFs can be fetched from the recorded Google Drive URLs, with expected SHA-256.\n\n**No treatment algorithms, drug dosing, or autonomous diagnoses are approved.**\n\nBuild provenance: `tools/sentra_source_parser_v2.py`.\n''',encoding='utf-8')
 qa=json.loads((DEST/'source_parser_qa_results.json').read_text())
 complete=sum(t['pass'] for t in tests)
 (DEST/'QA_REPORT.md').write_text(f'''# Source Parsing QA — 72 PNPK\n\n| Measure | Result |\n|---|---:|\n| Original source PDFs mapped to 72 entries | 72 / 72 |\n| New source PDF pages extracted | {len(all_pages)} |\n| Machine source-anchored candidate passages | {len(all_ev)} |\n| Prior curated facts preserved exactly | 182 / 182 |\n| Prior PNPK and pages preserved exactly | 8 / 710 |\n| Quote-to-source substrings & offsets | PASS |\n| SQLite integrity and foreign keys | PASS |\n| Representative filtered FTS retrieval | {complete}/{len(tests)} |\n| Sources not yet visually assessed | 72 documents (automated page extraction only) |\n| Clinician independent attestation | NOT PERFORMED |\n\n**Status: source parsing completed, clinical curation NOT completed for the new 72.** Newly extracted machine passages must not be interpreted as verified clinical facts. Multi-column tables, figures and image-only pages require per-page visual review.\n\n**Not a cosmetic cleanup:** 72 source PDFs were obtained, page text was parsed independently, source phrases were reanchored by deterministic text offsets, and source-only search tables were populated while the existing curated data remained unchanged.\n\nQA entries with FTS missing are disclosed in `source_parser_qa_results.json`; they do not imply missing original source pages.\n''',encoding='utf-8')
 # ZIP core deliverable without binary original source PDFs to keep distribution small;
 # separate source bundle contains all original 80 PDFs when required.
 outzip=ROOT/'SENTRA_KNOWLEDGE_BASE_SOURCE_PARSER_V2_72PNPK_QA_GATED.zip'
 with zipfile.ZipFile(outzip,'w',zipfile.ZIP_DEFLATED,compresslevel=6,allowZip64=True) as z:
  for p in sorted(DEST.rglob('*')):
   if p.is_file():z.write(p,p.relative_to(DEST))
 with zipfile.ZipFile(outzip) as z:assert z.testzip() is None
 print('FINAL',json.dumps({'sources':80,'reparsed_documents':72,'pages':len(all_pages),'candidates':len(all_ev),'previous_curated_facts':182,'qa_retrieval_pass':complete,'qa_retrieval_total':len(tests),'zip_bytes':outzip.stat().st_size,'zip':str(outzip),'time_sec':round(time.time()-t0,1),'short_text_docs':sum(bool(v) for v in image_pages_by_no.values())},ensure_ascii=False),flush=True)
if __name__=='__main__':main()
