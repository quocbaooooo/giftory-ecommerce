"""Fetch SIL OFL fonts and Vietnamese subsets for offline Studio rendering."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import json
import re
import urllib.request

ROOT = Path(__file__).resolve().parents[1] / 'frontend' / 'public' / 'fonts' / 'studio'
FAMILIES = {
    'Be Vietnam Pro': 'bevietnampro',
    'Dancing Script': 'dancingscript',
    'Lora': 'lora',
    'Mali': 'mali',
    'Roboto Mono': 'robotomono',
}
SOURCE = 'https://fonts.googleapis.com/css2?' + '&'.join(
    'family=' + name.replace(' ', '+') + ':wght@400;700' for name in FAMILIES
) + '&display=swap'


def fetch(url):
    request = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'})
    for attempt in range(3):
        try:
            return urllib.request.urlopen(request, timeout=20).read()
        except Exception:
            if attempt == 2:
                print('Failed:', url, flush=True)
                raise


def download(item):
    filename, url = item
    destination = ROOT / filename
    if destination.exists():
        return filename
    data = fetch(url)
    if filename.endswith('.woff2') and data[:4] != b'wOF2':
        raise RuntimeError('Invalid WOFF2: ' + filename)
    destination.write_bytes(data)
    print('Saved', filename, flush=True)
    return filename


def main():
    css = fetch(SOURCE).decode('utf-8')
    blocks = re.findall(r'/\* ([^*]+) \*/\s*(@font-face\s*\{[^}]+\})', css)
    selected = [(subset, block) for subset, block in blocks if subset in ('latin', 'latin-ext', 'vietnamese')]
    if not selected:
        raise RuntimeError('No subset declarations returned')
    ROOT.mkdir(parents=True, exist_ok=True)
    jobs = {}
    styles = []
    for subset, block in selected:
        family = re.search(r"font-family: '([^']+)'", block)[1]
        weight = re.search(r'font-weight: ([^;]+)', block)[1].replace(' ', '-')
        url = re.search(r'url\(([^)]+)\)', block)[1]
        filename = f'{FAMILIES[family]}-{subset}-{weight}.woff2'
        jobs[filename] = url
        styles.append('/* ' + subset + ' */\n' + block.replace(url, '/fonts/studio/' + filename))
    for family, directory in FAMILIES.items():
        jobs[directory + '-OFL.txt'] = 'https://raw.githubusercontent.com/google/fonts/main/ofl/' + directory + '/OFL.txt'
    with ThreadPoolExecutor(max_workers=6) as executor:
        results = list(executor.map(download, jobs.items()))
    (ROOT / 'fonts.css').write_text('\n\n'.join(styles) + '\n', encoding='utf-8')
    (ROOT / 'sources.json').write_text(json.dumps({'css': SOURCE, 'files': jobs}, indent=2) + '\n', encoding='utf-8')
    (ROOT / 'README.md').write_text(
        'Studio fonts, distributed under SIL Open Font License; see each *-OFL.txt.\n'
        'Latin, Latin Extended and Vietnamese subsets are served locally.\n'
        'Sources are recorded in sources.json. Regenerate with scripts/fetch-studio-fonts.py.\n', encoding='utf-8')
    print(f'Saved {len(results)} font/license files and {len(styles)} CSS declarations')


if __name__ == '__main__':
    main()
