#!/usr/bin/env python3
"""Fail closed on unsafe GitHub workflow automation.

Rejects: third-party actions without an immutable 40-hex commit SHA,
shell-piped installers, unrestricted autonomous agent flags, non-HTTPS
downloads, and downloads from endpoints that are not registered in the
SAFRS tool inventory. `--workflow-dir PATH` points the scan at a fixture
directory for tests; the tool inventory is always read from the repository.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
workflow_dir = ROOT / '.github' / 'workflows'
if '--workflow-dir' in sys.argv:
    index = sys.argv.index('--workflow-dir')
    if index + 1 >= len(sys.argv):
        raise SystemExit('--workflow-dir requires a path argument')
    workflow_dir = Path(sys.argv[index + 1])

inventory = json.loads(
    (ROOT / '.safrs' / 'tool-inventory.json').read_text(encoding='utf-8')
)
registered_hosts = {
    endpoint.lower()
    for tool in inventory.get('tools', [])
    if tool.get('review_status') != 'DISABLED'
    for endpoint in tool.get('network_endpoints', [])
}

# Third-party/repository actions must use a full 40-hex commit SHA. Local actions ./... are exempt.
uses_re = re.compile(r'^\s*-?\s*uses:\s*([^\s#]+)')
sha_re = re.compile(r'^.+@[0-9a-fA-F]{40}$')
piped_installer_re = re.compile(
    r'\b(?:curl|wget|iwr|invoke-webrequest|invoke-restmethod)\b[^|\n]*\|\s*'
    r'(?:sudo\s+)?(?:sh|bash|zsh|pwsh|powershell(?:\.exe)?|iex|invoke-expression)\b',
    re.I,
)
inline_expression_re = re.compile(
    r'\b(?:iex|invoke-expression)\b[^\n]*\b(?:iwr|invoke-webrequest|invoke-restmethod)\b',
    re.I,
)
autonomy_re = re.compile(
    r'--dangerously-skip-permissions|--yolo\b|\bdroid\b[^\n]*--auto\s+(?:high|max)\b',
    re.I,
)
download_re = re.compile(r'\b(?:curl|wget|iwr|invoke-webrequest|invoke-restmethod)\b', re.I)
url_re = re.compile(r'(https?)://([^\s"\'<>/]+)', re.I)
errors = []

if workflow_dir.exists():
    for file in sorted(list(workflow_dir.glob('*.yml')) + list(workflow_dir.glob('*.yaml'))):
        try:
            label = file.relative_to(ROOT)
        except ValueError:
            label = file.name
        for lineno, line in enumerate(file.read_text(encoding='utf-8').splitlines(), 1):
            if line.strip().startswith('#'):
                continue
            m = uses_re.match(line)
            if m:
                ref = m.group(1).strip('"\'')
                if not ref.startswith('./') and not ref.startswith('docker://'):
                    if not sha_re.match(ref):
                        errors.append(f'{label}:{lineno}: action not pinned to full SHA: {ref}')
            if piped_installer_re.search(line) or inline_expression_re.search(line):
                errors.append(f'{label}:{lineno}: shell-piped installer is forbidden')
            if autonomy_re.search(line):
                errors.append(f'{label}:{lineno}: unrestricted autonomous flag is forbidden')
            if download_re.search(line):
                for scheme, raw_host in url_re.findall(line):
                    if scheme.lower() != 'https':
                        errors.append(f'{label}:{lineno}: workflow download must use HTTPS')
                        continue
                    host = raw_host.split(':')[0].lower()
                    if host not in registered_hosts:
                        errors.append(
                            f'{label}:{lineno}: download endpoint not registered in tool inventory: {host}'
                        )

if errors:
    raise SystemExit('SAFRS GitHub Actions pinning failed:\n- ' + '\n- '.join(errors))
print('SAFRS GitHub Actions pinning: OK')
