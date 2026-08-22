#!/usr/bin/env python3
from pathlib import Path
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
errors = []
warnings = []

def require(condition, message):
    if not condition:
        errors.append(message)

def load_json(path):
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except Exception as exc:
        errors.append(f'Invalid JSON: {path.relative_to(ROOT)}: {exc}')
        return {}

def load_jsonl(path):
    rows = []
    try:
        for index, line in enumerate(path.read_text(encoding='utf-8').splitlines(), start=1):
            if not line.strip():
                continue
            try:
                rows.append(json.loads(line))
            except Exception as exc:
                errors.append(f'Invalid JSONL: {path.relative_to(ROOT)} line {index}: {exc}')
    except Exception as exc:
        errors.append(f'Cannot read JSONL {path.relative_to(ROOT)}: {exc}')
    return rows

required = [
    '.agent-ingest.json',
    'config/runtime/agent_runtime_contract.json',
    'config/persona/00_persona_manifest.json',
    'config/persona/SYSTEM_PROMPT_COMPILED.md',
    'config/persona/14_conversation_examples.jsonl',
    'config/persona/15_persona_evaluation_rubric.md',
    'config/persona/16_role_permission_baseline.json',
    'tests/persona/persona_test_cases.jsonl',
    'operations/CLAUDE_IMPLEMENTATION_HANDOFF_AGENT_KAYYISA.md',
]
for rel in required:
    require((ROOT / rel).is_file(), f'Missing required file: {rel}')

manifest_path = ROOT / 'config/persona/00_persona_manifest.json'
persona_manifest = load_json(manifest_path) if manifest_path.exists() else {}
modules = persona_manifest.get('source_modules_in_compile_order', [])
require(persona_manifest.get('agent_name') == 'Agent Kayyisa', 'agent_name must be Agent Kayyisa')
require(persona_manifest.get('runtime_entrypoint') == 'SYSTEM_PROMPT_COMPILED.md', 'Unexpected persona runtime entrypoint')
require(len(modules) >= 18, 'Persona module order is incomplete')
for name in modules:
    require((ROOT / 'config/persona' / name).is_file(), f'Manifest references missing module: {name}')

compiled_path = ROOT / 'config/persona/SYSTEM_PROMPT_COMPILED.md'
compiled = compiled_path.read_text(encoding='utf-8') if compiled_path.exists() else ''
required_phrases = [
    'Agent Kayyisa',
    'Internal staff notes are never shown',
    'Teachers are professional decision owners',
    'Every student is a person in development',
    'Javanese is a light cultural accent',
    'AI-generated summaries are derivative',
    'smallest useful next action',
]
for phrase in required_phrases:
    require(phrase.lower() in compiled.lower(), f'Compiled prompt missing required concept: {phrase}')
for name in modules:
    require(f'<!-- SOURCE MODULE: {name} -->' in compiled, f'Compiled prompt missing module marker: {name}')

# Placeholder scan.
placeholder_re = re.compile(r'\b(TBD|TODO|FIXME|IMPLEMENT LATER|FILL IN)\b', re.I)
for path in ROOT.rglob('*'):
    if path.resolve() == Path(__file__).resolve():
        continue
    if path.is_file() and path.suffix.lower() in {'.md', '.json', '.jsonl', '.csv', '.py'}:
        text = path.read_text(encoding='utf-8', errors='ignore')
        if placeholder_re.search(text):
            errors.append(f'Placeholder found in {path.relative_to(ROOT)}')

# Loader boundaries.
ingest = load_json(ROOT / '.agent-ingest.json')
require(ingest.get('system_instruction_entrypoint') == 'config/persona/SYSTEM_PROMPT_COMPILED.md', 'Ingest config must point to compiled persona')
require(ingest.get('vector_knowledge_include') == ['runtime/knowledge/**/*.jsonl'], 'Vector knowledge allowlist must contain only runtime knowledge JSONL')
exclusions = set(ingest.get('exclude_from_vector_embedding', []))
for needed in ['config/**', 'sources/**', 'operations/**', 'tests/**', 'tools/**', 'docs/**']:
    require(needed in exclusions, f'Missing vector exclusion: {needed}')

contract = load_json(ROOT / 'config/runtime/agent_runtime_contract.json')
require(contract.get('persona', {}).get('load_exactly_once') is True, 'Persona must load exactly once')
require(contract.get('persona', {}).get('entrypoint') == 'config/persona/SYSTEM_PROMPT_COMPILED.md', 'Runtime contract persona entrypoint mismatch')

# Role baseline.
roles = load_json(ROOT / 'config/persona/16_role_permission_baseline.json').get('roles', {})
for role in ['student', 'parent_guardian', 'teacher_tutor', 'authorized_staff', 'unknown']:
    require(role in roles, f'Missing role baseline: {role}')
for role in ['student', 'parent_guardian']:
    prohibited = roles.get(role, {}).get('must_not_receive', [])
    require('internal_staff_notes' in prohibited, f'{role} must explicitly prohibit internal_staff_notes')

# Examples and tests.
examples = load_jsonl(ROOT / 'config/persona/14_conversation_examples.jsonl')
tests = load_jsonl(ROOT / 'tests/persona/persona_test_cases.jsonl')
require(len(examples) >= 12, 'At least 12 conversation examples are required')
require(len(tests) >= 16, 'At least 16 persona test cases are required')
require(any(x.get('risk') == 'critical' for x in tests), 'Critical-risk tests are required')
require(any(x.get('audience') == 'teacher' for x in tests), 'Teacher tests are required')
require(any(x.get('audience') == 'student' for x in tests), 'Student tests are required')
require(any(x.get('audience') == 'parent_guardian' for x in tests), 'Parent tests are required')

# Javanese calibration in reference responses.
javanese_terms = ['monggo', 'nggih', 'matur nuwun', 'ngapunten', 'alon-alon']
for row in examples:
    response = row.get('assistant_response', '').lower()
    count = sum(response.count(term) for term in javanese_terms)
    require(count <= 1, f"Example {row.get('id')} uses more than one Javanese expression")
    if row.get('risk') == 'critical':
        require(count == 0, f"Critical example {row.get('id')} must not use Javanese")

# Package manifest sanity if present.
package_manifest = load_json(ROOT / 'manifest.json') if (ROOT / 'manifest.json').exists() else {}
if package_manifest:
    require(str(package_manifest.get('package_version', '')).startswith('3.'), 'Package manifest version must be 3.x')

if errors:
    print('AGENT KAYYISA VALIDATION: FAIL')
    for item in errors:
        print(f'- ERROR: {item}')
    for item in warnings:
        print(f'- WARNING: {item}')
    sys.exit(1)

print('AGENT KAYYISA VALIDATION: PASS')
print(f'- Persona modules: {len(modules)}')
print(f'- Conversation examples: {len(examples)}')
print(f'- Persona test cases: {len(tests)}')
print('- Vector ingest boundary: PASS')
print('- Privacy baseline: PASS')
print('- Javanese calibration: PASS')
print('- Compiled system prompt: PASS')
