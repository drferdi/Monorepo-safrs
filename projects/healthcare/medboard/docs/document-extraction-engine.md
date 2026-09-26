# Document Extraction Engine — Best Practices
# Architected and built by Drferdi.

## Overview

Engine untuk mengekstrak knowledge dari dokumen (buku ilmu anak, artikel medis, dll) menjadi structured JSON untuk knowledge base.

---

## Arsitektur Pipeline

```
Document Input (PDF/Image/Text)
  ↓
[1] Document Parser (OCR, PDF parsing, text extraction)
  ↓
[2] Chunking & Preprocessing (split, clean, normalize)
  ↓
[3] LLM Extraction Layer (structured extraction dengan schema)
  ↓
[4] Validation & Post-processing (schema validation, deduplication)
  ↓
[5] Knowledge Graph Builder (optional: entity linking, relationships)
  ↓
Structured JSON Output
```

---

## 1. Document Parser Layer

### Tools & Libraries

**PDF Processing:**
- `pdfplumber` — struktur tabel, text positioning
- `PyMuPDF` (fitz) — rendering, OCR fallback
- `pypdf` — metadata, basic extraction

**OCR (untuk gambar/scan):**
- `Tesseract OCR` — open source, akurat untuk Latin
- `EasyOCR` — multi-language, deep learning
- `PaddleOCR` — Chinese/Asian languages

**Image Processing:**
- `Pillow` — preprocessing (deskew, denoise, contrast)
- `opencv-python` — advanced image enhancement

### Best Practices

```python
# Example: Multi-format parser
def parse_document(file_path: str, file_type: str) -> str:
    """Extract raw text from document."""
    if file_type == "pdf":
        return parse_pdf(file_path)
    elif file_type == "image":
        return parse_image_with_ocr(file_path)
    elif file_type == "text":
        return read_text_file(file_path)
    else:
        raise ValueError(f"Unsupported type: {file_type}")

def parse_pdf(file_path: str) -> str:
    """Extract text from PDF with table preservation."""
    import pdfplumber
    
    text_parts = []
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            # Extract text
            text = page.extract_text()
            if text:
                text_parts.append(text)
            
            # Extract tables
            tables = page.extract_tables()
            for table in tables:
                text_parts.append(format_table_as_text(table))
    
    return "\n\n".join(text_parts)
```

---

## 2. Chunking & Preprocessing

### Strategy

**Chunking:**
- **Semantic chunking**: Split berdasarkan topik/paragraf (bukan fixed size)
- **Overlap**: 10-20% overlap antar chunk untuk context preservation
- **Max chunk size**: 1000-2000 tokens (tergantung LLM context window)

**Preprocessing:**
- Normalize whitespace, encoding
- Remove headers/footers (jika tidak relevan)
- Preserve structure markers (heading levels, lists)

### Implementation

```python
from typing import List
import tiktoken  # atau library tokenizer lain

def chunk_document(
    text: str,
    max_tokens: int = 1500,
    overlap_tokens: int = 200,
) -> List[str]:
    """Split document into semantic chunks with overlap."""
    # Tokenize
    encoding = tiktoken.get_encoding("cl100k_base")
    tokens = encoding.encode(text)
    
    chunks = []
    start = 0
    
    while start < len(tokens):
        end = min(start + max_tokens, len(tokens))
        chunk_tokens = tokens[start:end]
        chunk_text = encoding.decode(chunk_tokens)
        chunks.append(chunk_text)
        
        # Overlap: move back by overlap_tokens
        start = end - overlap_tokens
    
    return chunks
```

---

## 3. LLM Extraction Layer (Core)

### Schema Design Principles

**1. Descriptive Field Names**
```json
{
  "concept_name": "...",  // ✅ Good: jelas
  "definition": "...",     // ✅ Good: deskriptif
  "x": "..."              // ❌ Bad: tidak jelas
}
```

**2. Location-Specific Descriptions**
```json
{
  "concept_name": {
    "type": "string",
    "description": "Nama konsep ilmiah yang disebutkan di awal paragraf atau dalam bold/heading"
  },
  "age_group": {
    "type": "string",
    "enum": ["toddler", "preschool", "elementary", "teen"],
    "description": "Target usia pembaca yang disebutkan eksplisit atau diimplikasikan dari konten"
  }
}
```

**3. Constrain dengan Enums**
```json
{
  "subject_category": {
    "type": "string",
    "enum": ["biology", "physics", "chemistry", "astronomy", "geography", "history"]
  }
}
```

### Structured Output dengan LLM

**Option 1: OpenAI Function Calling / Structured Outputs**

```python
from openai import OpenAI
import json

client = OpenAI()

# Define schema
KNOWLEDGE_SCHEMA = {
    "type": "object",
    "properties": {
        "concepts": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "definition": {"type": "string"},
                    "examples": {
                        "type": "array",
                        "items": {"type": "string"}
                    },
                    "related_concepts": {
                        "type": "array",
                        "items": {"type": "string"}
                    },
                    "age_appropriateness": {
                        "type": "string",
                        "enum": ["toddler", "preschool", "elementary", "teen"]
                    }
                },
                "required": ["name", "definition"]
            }
        },
        "key_facts": {
            "type": "array",
            "items": {"type": "string"}
        },
        "learning_objectives": {
            "type": "array",
            "items": {"type": "string"}
        }
    },
    "required": ["concepts"]
}

def extract_knowledge(chunk: str) -> dict:
    """Extract structured knowledge from text chunk."""
    response = client.beta.chat.completions.parse(
        model="gpt-4o-2024-11-20",
        messages=[
            {
                "role": "system",
                "content": """Kamu adalah expert dalam mengekstrak knowledge dari buku ilmu anak.
                Ekstrak konsep-konsep penting, definisi, fakta kunci, dan tujuan pembelajaran.
                Fokus pada informasi yang edukatif dan sesuai untuk anak-anak."""
            },
            {
                "role": "user",
                "content": f"Ekstrak knowledge dari teks berikut:\n\n{chunk}"
            }
        ],
        response_format=KNOWLEDGE_SCHEMA,
        temperature=0.1,  # Low temperature untuk konsistensi
    )
    
    return response.choices[0].message.parsed
```

**Option 2: Anthropic Structured Outputs**

```python
from anthropic import Anthropic
import json

client = Anthropic()

def extract_knowledge_anthropic(chunk: str) -> dict:
    """Extract using Anthropic structured outputs."""
    message = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=4096,
        messages=[
            {
                "role": "user",
                "content": f"Ekstrak knowledge dari teks berikut:\n\n{chunk}"
            }
        ],
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "knowledge_extraction",
                "strict": True,
                "schema": KNOWLEDGE_SCHEMA
            }
        },
    )
    
    return json.loads(message.content[0].text)
```

**Option 3: Pydantic Models (LlamaIndex Pattern)**

```python
from pydantic import BaseModel, Field
from typing import List, Optional
from llama_index.core.program import LLMTextCompletionProgram

class Concept(BaseModel):
    name: str = Field(description="Nama konsep ilmiah")
    definition: str = Field(description="Definisi yang mudah dipahami anak")
    examples: List[str] = Field(default_factory=list, description="Contoh konkret")
    related_concepts: List[str] = Field(default_factory=list)
    age_appropriateness: Optional[str] = Field(None, enum=["toddler", "preschool", "elementary", "teen"])

class KnowledgeExtraction(BaseModel):
    concepts: List[Concept] = Field(description="Daftar konsep yang ditemukan")
    key_facts: List[str] = Field(default_factory=list, description="Fakta-fakta penting")
    learning_objectives: List[str] = Field(default_factory=list, description="Tujuan pembelajaran")

def extract_with_pydantic(chunk: str) -> KnowledgeExtraction:
    """Extract using Pydantic schema."""
    program = LLMTextCompletionProgram.from_defaults(
        output_cls=KnowledgeExtraction,
        prompt_template_str="""Ekstrak knowledge dari teks berikut:
        
{input_str}

Fokus pada konsep-konsep penting yang edukatif untuk anak-anak.""",
        llm=llm,  # Your LLM instance
    )
    
    return program(input_str=chunk)
```

---

## 4. Validation & Post-processing

### Schema Validation

```python
from jsonschema import validate, ValidationError

def validate_extraction(data: dict, schema: dict) -> tuple[bool, list[str]]:
    """Validate extracted data against schema."""
    errors = []
    try:
        validate(instance=data, schema=schema)
        return True, []
    except ValidationError as e:
        errors.append(f"Schema validation error: {e.message}")
        return False, errors
```

### Deduplication

```python
def deduplicate_concepts(extractions: List[dict]) -> dict:
    """Merge multiple extractions, deduplicate concepts."""
    all_concepts = {}
    
    for extraction in extractions:
        for concept in extraction.get("concepts", []):
            name = concept["name"].lower().strip()
            
            if name not in all_concepts:
                all_concepts[name] = concept
            else:
                # Merge: combine examples, related concepts
                existing = all_concepts[name]
                existing["examples"].extend(concept.get("examples", []))
                existing["related_concepts"].extend(concept.get("related_concepts", []))
                # Deduplicate lists
                existing["examples"] = list(set(existing["examples"]))
                existing["related_concepts"] = list(set(existing["related_concepts"]))
    
    return {
        "concepts": list(all_concepts.values()),
        "key_facts": list(set(
            fact for ext in extractions for fact in ext.get("key_facts", [])
        )),
        "learning_objectives": list(set(
            obj for ext in extractions for obj in ext.get("learning_objectives", [])
        ))
    }
```

---

## 5. Knowledge Graph Builder (Optional)

### Entity-Relationship Extraction

```python
class KnowledgeGraphBuilder:
    """Build knowledge graph from extracted concepts."""
    
    def build_graph(self, extractions: List[dict]) -> dict:
        """Create graph structure."""
        nodes = []
        edges = []
        
        for extraction in extractions:
            for concept in extraction.get("concepts", []):
                # Add concept node
                nodes.append({
                    "id": concept["name"],
                    "type": "concept",
                    "properties": concept
                })
                
                # Add relationships
                for related in concept.get("related_concepts", []):
                    edges.append({
                        "source": concept["name"],
                        "target": related,
                        "relationship": "related_to"
                    })
        
        return {
            "nodes": nodes,
            "edges": edges
        }
```

---

## 6. Complete Pipeline Example

```python
from typing import List, Dict
import json

class DocumentExtractionEngine:
    """Complete document extraction pipeline."""
    
    def __init__(self, llm_client, schema: dict):
        self.llm_client = llm_client
        self.schema = schema
    
    def process_document(
        self,
        file_path: str,
        file_type: str,
    ) -> Dict:
        """Process document end-to-end."""
        
        # 1. Parse
        raw_text = parse_document(file_path, file_type)
        
        # 2. Chunk
        chunks = chunk_document(raw_text, max_tokens=1500, overlap_tokens=200)
        
        # 3. Extract (parallel processing)
        extractions = []
        for chunk in chunks:
            extraction = self.extract_knowledge(chunk)
            extractions.append(extraction)
        
        # 4. Validate & Merge
        merged = deduplicate_concepts(extractions)
        
        # 5. Build graph (optional)
        graph = KnowledgeGraphBuilder().build_graph(extractions)
        
        return {
            "metadata": {
                "source": file_path,
                "chunks_processed": len(chunks),
                "concepts_found": len(merged["concepts"])
            },
            "knowledge": merged,
            "graph": graph  # Optional
        }
    
    def extract_knowledge(self, chunk: str) -> dict:
        """Extract using LLM with schema."""
        # Implementation sesuai LLM provider
        pass
```

---

## 7. JSON Output Structure (Recommended)

```json
{
  "metadata": {
    "source": "buku-ilmu-anak-01.pdf",
    "extraction_date": "2026-03-15T10:30:00Z",
    "chunks_processed": 12,
    "total_concepts": 45
  },
  "knowledge": {
    "concepts": [
      {
        "name": "Fotosintesis",
        "definition": "Proses tanaman membuat makanan sendiri menggunakan sinar matahari",
        "examples": [
          "Daun hijau menyerap sinar matahari",
          "Tanaman menghasilkan oksigen"
        ],
        "related_concepts": ["klorofil", "oksigen", "karbon dioksida"],
        "age_appropriateness": "elementary",
        "subject_category": "biology"
      }
    ],
    "key_facts": [
      "Tanaman membutuhkan air, sinar matahari, dan karbon dioksida untuk fotosintesis",
      "Fotosintesis menghasilkan oksigen yang kita hirup"
    ],
    "learning_objectives": [
      "Memahami bagaimana tanaman membuat makanan",
      "Mengetahui pentingnya tanaman untuk kehidupan"
    ]
  },
  "graph": {
    "nodes": [...],
    "edges": [...]
  }
}
```

---

## 8. Best Practices Summary

### ✅ DO

1. **Schema-first approach**: Define schema sebelum extraction
2. **Descriptive field names**: Gunakan nama yang jelas dan deskriptif
3. **Location hints**: Beri tahu LLM di mana menemukan informasi
4. **Enum constraints**: Batasi nilai dengan enum untuk konsistensi
5. **Chunking dengan overlap**: Preserve context antar chunk
6. **Validation**: Validasi schema setelah extraction
7. **Deduplication**: Merge hasil dari multiple chunks
8. **Error handling**: Retry dengan reflection jika extraction gagal
9. **Temperature rendah**: Gunakan temperature 0.1-0.3 untuk konsistensi
10. **Spot-checking**: Manual review untuk sample hasil

### ❌ DON'T

1. **Jangan skip preprocessing**: Raw text perlu dibersihkan
2. **Jangan terlalu besar chunk**: Max 2000 tokens per chunk
3. **Jangan tanpa schema**: LLM perlu guidance yang jelas
4. **Jangan ignore validation**: Schema validation wajib
5. **Jangan langsung trust LLM**: Always validate output
6. **Jangan terlalu kompleks schema**: Mulai sederhana, iterasi

---

## 9. Tools & Libraries Recommendation

**Document Parsing:**
- `pdfplumber` — PDF dengan tabel
- `PyMuPDF` — PDF rendering
- `Tesseract OCR` — OCR
- `EasyOCR` — Multi-language OCR

**LLM Integration:**
- `openai` — OpenAI structured outputs
- `anthropic` — Anthropic structured outputs
- `llama-index` — Pydantic-based extraction
- `langchain` — Chain-based extraction

**Validation:**
- `jsonschema` — JSON schema validation
- `pydantic` — Type validation & parsing

**Knowledge Graph:**
- `neo4j` — Graph database
- `networkx` — In-memory graph
- `rdflib` — RDF/OWL graphs

---

## 10. Performance Optimization

1. **Parallel Processing**: Process chunks secara parallel
2. **Caching**: Cache hasil extraction per chunk (hash-based)
3. **Batch API Calls**: Batch multiple chunks dalam satu request jika memungkinkan
4. **Streaming**: Stream hasil untuk dokumen besar
5. **Incremental Updates**: Update knowledge base secara incremental

---

## References

- [PARSE: LLM Driven Schema Optimization](https://arxiv.org/html/2510.08623v1)
- [Structured Data Extraction Guide](https://docs.llamaindex.ai/en/stable/understanding/extraction/)
- [Neo4j Knowledge Graph Builder](https://neo4j.com/docs/neo4j-graphrag-python/current/user_guide_kg_builder.html)
