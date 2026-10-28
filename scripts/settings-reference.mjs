// Every option of each family's Settings, read from the family's own code at build time, so the reference can never
// lag it: Material's generated search index, Waffle's settings pages, iRiS's option registry. `families` is an
// inir-hub checkout's families/ folder; each family missing there is left out.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const tr = (text) => [...text.matchAll(/(?:Translation\.tr\()?"((?:[^"\\]|\\.)*)"\)?/g)].map((m) => m[1].replace(/\\"/g, '"'));
const clean = (text) => String(text ?? '').replace(/\s+/g, ' ').replace(/\\n/g, ' ').trim();
const line = (label, description) => `- **${clean(label)}**${description ? `: ${clean(description)}` : ''}`;

function material(dir) {
	const registry = join(dir, 'settings', 'SettingsPageRegistry.qml');
	const index = join(dir, 'settings', 'settings-search-index.generated.json');
	if (!existsSync(registry) || !existsSync(index)) return null;
	const listed = [...readFileSync(registry, 'utf8').matchAll(/^\s+name: (?:Translation\.tr\()?"([^"]+)"[\s\S]*?^\s+component: "[^"]*\/([^"/]+)"/gm)];
	const names = listed.map((m) => m[1]);
	const pages = new Map();
	// A section's own entry lists its strings in order, each option's name then its description: a description reads
	// as a sentence (long, or ending in a period), a name doesn't.
	const sentence = (text) => text.length > 38 || /[.!?]$/.test(text);
	for (const entry of JSON.parse(readFileSync(index, 'utf8'))) {
		const page = names[entry.pageIndex];
		if (!page || !entry.section || entry.label !== entry.section) continue;
		const sections = pages.get(page) ?? pages.set(page, new Map()).get(page);
		const rows = sections.get(entry.section) ?? sections.set(entry.section, new Map()).get(entry.section);
		let last = null;
		for (const word of (entry.keywords ?? []).filter((k) => k && k !== entry.section && k !== entry.task)) {
			if (sentence(word)) { if (last && !rows.get(last)) rows.set(last, word); continue; }
			if (!rows.has(word)) rows.set(word, '');
			last = word;
		}
		if (!rows.size) sections.delete(entry.section);
	}
	for (const [, page, file] of listed) {
		if (pages.has(page) && existsSync(join(dir, 'settings', file))) choices(join(dir, 'settings', file), pages.get(page));
	}
	return { title: 'Every Material setting', root: 'Settings', pages: names.filter((name) => pages.has(name)).map((name) => [name, pages.get(name)]) };
}

// A selector's choices live only in the page's QML: each one goes on its subsection's row, or its section's.
function choices(file, sections) {
	const lines = readFileSync(file, 'utf8').split('\n');
	const titleAt = (i) => tr(lines.slice(i + 1, i + 7).join('\n').match(/^\s+title: (.*)$/m)?.[1] ?? '')[0];
	let section = '', depth = 0;
	const subs = [];
	lines.forEach((l, i) => {
		const before = depth;
		depth += (l.match(/\{/g) ?? []).length - (l.match(/\}/g) ?? []).length;
		// a subsection's title holds only inside its own braces
		while (subs.length && depth <= subs.at(-1)[1]) subs.pop();
		if (/^\s+(SettingsCardSection|ContentSection) \{/.test(l)) { section = titleAt(i) ?? section; subs.length = 0; return; }
		if (/^\s+ContentSubsection \{/.test(l)) { subs.push([titleAt(i) ?? '', before]); return; }
		if (!/^\s+ConfigSelectionArray \{/.test(l) || !sections.has(section)) return;
		const end = lines.findIndex((x, j) => j > i && /^\s+\]/.test(x));
		const names = lines.slice(i, end < 0 ? i + 40 : end).flatMap((x) => tr(x.match(/displayName: (.*?)(?:,\s*\w+:|\s*\}|$)/)?.[1] ?? ''));
		if (names.length < 2) return;
		const rows = sections.get(section);
		const label = subs.at(-1)?.[0] || section;
		const said = `${names.slice(0, -1).join(', ')} or ${names.at(-1)}.`;
		if (rows.has(label)) rows.set(label, rows.get(label) ? `${rows.get(label)} ${said}` : said);
		else sections.set(section, new Map([[label, said], ...rows]));
	});
}

function waffle(dir) {
	const app = join(dir, 'settings', 'WaffleSettingsApp.qml');
	if (!existsSync(app)) return null;
	const pages = [];
	for (const [, name, file] of readFileSync(app, 'utf8').matchAll(/name: Translation\.tr\("([^"]+)"\)[\s\S]*?component: Qt\.resolvedUrl\("pages\/([^"]+)"\)/g)) {
		if (!existsSync(join(dir, 'settings', 'pages', file))) continue;
		const lines = readFileSync(join(dir, 'settings', 'pages', file), 'utf8').split('\n');
		const sections = new Map();
		let card = '';
		lines.forEach((l, i) => {
			const block = l.match(/^\s+(WSettingsCard|WSettings(?:Switch|SpinBox|Dropdown|Slider|TextField|Row|Button)) \{/);
			if (!block) return;
			const body = lines.slice(i + 1, i + 8).join('\n');
			if (block[1] === 'WSettingsCard') { card = tr(body.match(/title: (.*)/)?.[1] ?? '')[0] ?? card; return; }
			const label = tr(body.match(/(?:label|text): (.*)/)?.[1] ?? '')[0];
			if (!label) return;
			const rows = sections.get(card) ?? sections.set(card, new Map()).get(card);
			rows.set(label, tr(body.match(/description: (.*)/)?.[1] ?? '')[0]);
		});
		pages.push([name, sections.size ? sections : new Map([['', new Map()]])]);
	}
	return { title: 'Every Waffle setting', root: 'Waffle Settings', pages };
}

function iris(dir) {
	const file = join(dir, 'settings', 'IrisOptions.qml');
	if (!existsSync(file)) return null;
	const text = readFileSync(file, 'utf8');
	const titles = new Map([...text.matchAll(/\{ id: "(\w+)", cluster: [-\d]+, title: "([^"]+)", subtitle: "([^"]+)"/g)].map((m) => [m[1], [m[2], m[3]]]));
	const pages = new Map([...titles.keys()].map((id) => [id, new Map()]));
	// Whole groups shown on another page (movedGroups), and where a Customize row (target:) lands (sectionOf), as IrisOptions does
	const moved = new Map([...(text.match(/movedGroups: \(\{([\s\S]*?)\n\s+\}\)/)?.[1] ?? '').matchAll(/(\w+): \{ to: "(\w+)", groups: \[([^\]]*)\]/g)]
		.map((m) => [m[1], [m[2], tr(m[3])]]));
	const place = (section, group) => (moved.get(section)?.[1].includes(group) ? moved.get(section)[0] : section);
	const sectionOf = (target, path, group) => ({
		island: 'bar', pieces: 'bubbles', motion: 'motion', dock: 'dock', desktop: 'desktop',
		bodies: path.startsWith('iris.player.') ? 'player' : group === 'Control Center' ? 'controlCenter' : 'bubbles',
		places: path.startsWith('iris.wallpaper.') || path.includes('.gallery.') ? 'desktop' : { Spotlight: 'spotlight', Orbit: 'orbit', 'Panel look': 'sidebars' }[group] ?? 'appearance',
		transients: group === 'Notifications' || group === 'Banners' ? 'notifications' : 'sound',
	})[target] ?? 'appearance';
	const known = new Set();
	const add = (row, section) => {
		const get = (key) => row.match(new RegExp(`\\b${key}: "((?:[^"\\\\]|\\\\.)*)"`))?.[1];
		const label = get('label'), group = get('group') ?? '', path = get('path');
		const id = place(section, group);
		if (!label || !pages.has(id) || (path && known.has(path))) return;
		if (path) known.add(path);
		const rows = pages.get(id).get(group) ?? pages.get(id).set(group, new Map()).get(group);
		if (!rows.has(label)) rows.set(label, get('description'));
	};
	for (const row of text.matchAll(/^\s+\{[^\n]*\bsection: "(\w+)"[^\n]*$/gm)) add(row[0], row[1]);
	for (const row of text.matchAll(/^\s+\{[^\n]*\btarget: "(\w+)"[^\n]*$/gm)) {
		const get = (key) => row[0].match(new RegExp(`\\b${key}: "([^"]*)"`))?.[1] ?? '';
		add(row[0], sectionOf(row[1], get('path'), get('group')));
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
				if (!rows.size) body.push('Nothing to set here: you use this page directly.');
				body.push('');
			}
		}
		out.push({ name, title: ref.title, text: body.join('\n') });
	}
	return out;
}
