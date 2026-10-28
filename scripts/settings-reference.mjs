// Every option of each family's Settings, read from the family's own code at build time, so the reference can never
// lag it: Material's generated search index, Waffle's settings pages, iRiS's option registry. `families` is an
// inir-hub checkout's families/ folder; each family missing there is left out.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const tr = (text) => [...text.matchAll(/(?:Translation\.tr\()?"((?:[^"\\]|\\.)*)"\)?/g)].map((m) => m[1].replace(/\\"/g, '"'));
const clean = (text) => String(text ?? '').replace(/\s+/g, ' ').replace(/\\n/g, ' ').trim();
const line = (label, description) => `- **${clean(label)}**${description ? `: ${clean(description)}` : ''}`;

function material(dir) {
	const registry = join(dir, 'settings', 'SettingsPageRegistry.qml');
	const index = join(dir, 'settings', 'settings-search-index.generated.json');
	if (!existsSync(registry) || !existsSync(index)) return null;
	const names = [...readFileSync(registry, 'utf8').matchAll(/^\s+name: (?:Translation\.tr\()?"([^"]+)"/gm)].map((m) => m[1]);
	const pages = new Map();
	for (const entry of JSON.parse(readFileSync(index, 'utf8'))) {
		const page = names[entry.pageIndex];
		if (!page || !entry.label || entry.label === entry.section) continue;
		const sections = pages.get(page) ?? pages.set(page, new Map()).get(page);
		const rows = sections.get(entry.section) ?? sections.set(entry.section, new Map()).get(entry.section);
		// The index keeps a row's description among its keywords: the first long one that isn't a name.
		const description = (entry.keywords ?? []).find((k) => k.length > 24 && k !== entry.label && k !== entry.section);
		if (!rows.has(entry.label)) rows.set(entry.label, description);
	}
	return { title: 'Every Material setting', root: 'Settings', pages: names.filter((name) => pages.has(name)).map((name) => [name, pages.get(name)]) };
}

function waffle(dir) {
	const folder = join(dir, 'settings', 'pages');
	if (!existsSync(folder)) return null;
	const pages = [];
	for (const file of readdirSync(folder).filter((f) => /^W.*Page\.qml$/.test(f)).sort()) {
		const lines = readFileSync(join(folder, file), 'utf8').split('\n');
		const title = lines.map((l) => l.match(/^\s+title: (.*)$/)).find(Boolean);
		const sections = new Map();
		let card = '';
		lines.forEach((l, i) => {
			const block = l.match(/^\s+(WSettingsCard|WSettings(?:Switch|SpinBox|Dropdown|Slider|TextField|Row)) \{/);
			if (!block) return;
			const body = lines.slice(i + 1, i + 8).join('\n');
			if (block[1] === 'WSettingsCard') { card = tr(body.match(/title: (.*)/)?.[1] ?? '')[0] ?? card; return; }
			const label = tr(body.match(/(?:label|text): (.*)/)?.[1] ?? '')[0];
			if (!label) return;
			const rows = sections.get(card) ?? sections.set(card, new Map()).get(card);
			rows.set(label, tr(body.match(/description: (.*)/)?.[1] ?? '')[0]);
		});
		if (sections.size) pages.push([tr(title?.[1] ?? '')[0] ?? file.slice(1, -8), sections]);
	}
	return { title: 'Every Waffle setting', root: 'Waffle Settings', pages };
}

function iris(dir) {
	const file = join(dir, 'settings', 'IrisOptions.qml');
	if (!existsSync(file)) return null;
	const text = readFileSync(file, 'utf8');
	const titles = new Map([...text.matchAll(/\{ id: "(\w+)", cluster: [-\d]+, title: "([^"]+)", subtitle: "([^"]+)"/g)].map((m) => [m[1], [m[2], m[3]]]));
	const pages = new Map([...titles.keys()].map((id) => [id, new Map()]));
	for (const row of text.matchAll(/^\s+\{[^\n]*\bsection: "(\w+)"[^\n]*$/gm)) {
		const get = (key) => row[0].match(new RegExp(`\\b${key}: "((?:[^"\\\\]|\\\\.)*)"`))?.[1];
		const label = get('label');
		if (!label || !pages.has(row[1])) continue;
		const group = get('group') ?? '';
		const rows = pages.get(row[1]).get(group) ?? pages.get(row[1]).set(group, new Map()).get(group);
		if (!rows.has(label)) rows.set(label, get('description'));
	}
	return { title: 'Every iRiS setting', root: 'iRiS Settings', subtitles: titles, pages: [...pages].filter(([, s]) => s.size).map(([id, s]) => [titles.get(id)[0], s, titles.get(id)[1]]) };
}

const intro = (root) => `Every option in ${root}, page by page, read from the family's code each time this site is built. In ${root}, **Ctrl+F** finds any of them and takes you there.`;

export function settingsReference(families) {
	const out = [];
	for (const [id, read, name] of [['ii', material, 'REFERENCE_MATERIAL'], ['waffle', waffle, 'REFERENCE_WAFFLE'], ['iris', iris, 'REFERENCE_IRIS']]) {
		const dir = join(families, id);
		const ref = existsSync(dir) ? read(dir) : null;
		if (!ref || !ref.pages.length) continue;
		const body = [`# ${ref.title}`, '', intro(ref.root), ''];
		for (const [page, sections, subtitle] of ref.pages) {
			body.push(`## ${page}`, '');
			if (subtitle) body.push(`${subtitle}.`, '');
			for (const [section, rows] of sections) {
				if (section) body.push(`### ${section}`, '');
				for (const [label, description] of rows) body.push(line(label, description));
				body.push('');
			}
		}
		out.push({ name, title: ref.title, text: body.join('\n') });
	}
	return out;
}
