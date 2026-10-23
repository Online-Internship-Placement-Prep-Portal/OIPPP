#!/usr/bin/env python3
"""Focused, dependency-free checks for Member 4's SRS/diagram deliverables."""
from pathlib import Path
from urllib.parse import unquote, urlsplit
import re
import struct
import sys

ROOT = Path(__file__).resolve().parents[2]
DOCS = [
    ROOT / 'docs/other-docs/SRS.md',
    ROOT / 'docs/other-docs/aptitude-analytics-quality.md',
    ROOT / 'docs/other-docs/diagrams/README.md',
]
DIAGRAMS = ['component', 'er', 'use_case', 'seq_test_attempt']
errors = []
link_count = 0


def anchors(path):
    text = path.read_text(encoding='utf-8')
    headings = re.findall(r'^#{1,6}\s+(.+?)\s*#*$', text, re.M)
    return {re.sub(r'[^\w\- ]', '', h.lower()).replace(' ', '-') for h in headings}


for doc in DOCS:
    if not doc.is_file():
        errors.append(f'Missing document: {doc.relative_to(ROOT)}')
        continue
    for raw in re.findall(r'!?\[[^\]]*\]\(([^)]+)\)', doc.read_text(encoding='utf-8')):
        url = urlsplit(raw)
        if url.scheme or url.netloc:
            continue
        link_count += 1
        target = (doc.parent / unquote(url.path)).resolve() if url.path else doc
        if not target.is_relative_to(ROOT):
            errors.append(f'Link leaves repository: {raw}')
        elif not target.exists():
            errors.append(f'{doc.relative_to(ROOT)} -> missing {raw}')
        elif url.fragment and target.suffix == '.md' and unquote(url.fragment) not in anchors(target):
            errors.append(f'{doc.relative_to(ROOT)} -> missing anchor {raw}')

srs = (ROOT / 'docs/other-docs/aptitude-analytics-quality.md').read_text(encoding='utf-8')
required = [f'TST-{i}' for i in range(1, 7)] + [f'ANL-{i}' for i in range(1, 4)]
required += [f'SAFE-{i}' for i in range(1, 3)] + [f'QA-{i}' for i in range(1, 6)]
required += [f'PERF-{i}' for i in range(1, 4)]
for requirement in required:
    if not re.search(rf'\| {re.escape(requirement)}(?:\s|\|)', srs):
        errors.append(f'Missing requirement row: {requirement}')
for heading in ['## 5.4 Aptitude Test Engine', '## 5.5 Progress Tracking and Analytics',
                '## 6.3 Quality Attributes and Related Constraints']:
    if heading not in srs:
        errors.append(f'Missing owned section: {heading}')

for name in DIAGRAMS:
    source = ROOT / f'docs/other-docs/diagrams/{name}.puml'
    image = source.with_suffix('.png')
    if not source.is_file() or not image.is_file():
        errors.append(f'Missing source/PNG pair: {name}')
        continue
    content = source.read_text(encoding='utf-8')
    if content.count('@startuml') != 1 or content.count('@enduml') != 1:
        errors.append(f'Invalid PlantUML boundaries: {name}')
    for include in re.findall(r'^!include\s+(.+)$', content, re.M):
        if '://' in include or not (source.parent / include.strip()).is_file():
            errors.append(f'Missing/nonlocal include in {name}: {include}')
    data = image.read_bytes()
    if data[:8] != b'\x89PNG\r\n\x1a\n' or len(data) < 24:
        errors.append(f'Invalid PNG header: {name}')
        continue
    width, height = struct.unpack('>II', data[16:24])
    if width < 200 or height < 200:
        errors.append(f'Unexpected image dimensions: {name}')
    print(f'Image pair: {name} ({width} x {height})')

if errors:
    print('\n'.join(errors), file=sys.stderr)
    sys.exit(1)
print(f'PASS: {link_count} local links/anchors, {len(required)} requirement rows, '
      f'{len(DIAGRAMS)} diagram pairs, 3 owned sections.')
print('Renderer syntax checks and visual inspection remain required separately.')
