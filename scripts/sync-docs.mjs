// Brings iNiR's docs into the site. Each repo keeps the pages about its own code in its `docs/` (the base in inir, a
// family in inir-hub's `docs/<id>`), with a `docs.json` naming its pages and the sidebar group each sits in; this
// script only gathers and adapts them: a title from the first heading, links between pages to site routes, media
// paths, the sidebar. INIR_DOCS lists the folders, `:` between them, `*` for every folder at that level; the first is
// the base's, whose VERSION and CHANGELOG.md sit beside it. Nothing here is edited by hand after a sync.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { keybindsReference } from './keybinds-reference.mjs';
import { settingsReference } from './settings-reference.mjs';

const root = resolve(import.meta.dirname, '..');
const base = (process.env.SITE_BASE ?? '/').replace(/\/?$/, '/');
const pages = join(root, 'src', 'content', 'docs', 'docs');
const media = join(root, 'public', 'docs-media');

const sources = (process.env.INIR_DOCS ?? join(root, '..', 'inir', 'docs')).split(':').filter(Boolean).flatMap((entry) => {
	const at = entry.indexOf('*');
	if (at < 0) return [resolve(entry)];
	const parent = resolve(entry.slice(0, at));
	const tail = entry.slice(at + 1).replace(/^\//, '');
	return existsSync(parent) ? readdirSync(parent).sort().map((name) => resolve(parent, name, tail)).filter(existsSync) : [];
});
const source = sources[0];
if (!source || !existsSync(source)) {
	console.error(`sync-docs: no docs at ${source}. Set INIR_DOCS to an iNiR checkout's docs/ folder.`);
	process.exit(1);
}

// docs.json: { id, edit, order, groups: [{ label, pages: [NAME, ...], labels: { NAME: short label } }] }; folders
// sort by order, the base first. A folder without one (an older iNiR) falls back
// to its _Sidebar.md.
const folders = sources.map((dir) => {
	const meta = existsSync(join(dir, 'docs.json')) ? JSON.parse(readFileSync(join(dir, 'docs.json'), 'utf8')) : {};
	const files = readdirSync(dir).filter((name) => name.endsWith('.md') && !name.startsWith('_'));
	return { dir, id: meta.id ?? basename(dirname(dir)), edit: meta.edit ?? 'https://github.com/snowarch/iNiR/edit/main/docs/', groups: meta.groups ?? null, order: meta.order ?? 0, files };
}).map((folder, index) => ({ ...folder, order: index === 0 ? -1 : folder.order })).sort((a, b) => a.order - b.order);

// Pages the base's code lists, built here and served as the base's own: the keybinds from its Niri binds. An older
// iNiR that still has the page by hand keeps it.
const virtual = new Map();
const binds = keybindsReference(join(source, '..', 'defaults', 'niri', 'config.d', '70-binds.kdl'));
if (binds && !folders[0].files.includes('KEYBINDS.md')) {
	virtual.set(join(folders[0].dir, 'KEYBINDS.md'), { text: binds, edit: folders[0].edit.replace(/docs\/$/, 'defaults/niri/config.d/70-binds.kdl') });
	folders[0].files.push('KEYBINDS.md');
}
const read = (path) => virtual.get(path)?.text ?? readFileSync(path, 'utf8');

const slugOf = (name) => (name === 'index' || name === 'Home' ? '' : name.toLowerCase().replace(/_/g, '-'));
const known = new Set(folders.flatMap((folder) => folder.files.map((file) => basename(file, '.md'))).concat('Home'));
const route = (name, hash = '') => `${base}docs/${slugOf(name) ? slugOf(name) + '/' : ''}${hash}`;
const link = (name) => `/docs/${slugOf(name) ? slugOf(name) + '/' : ''}`;

function relink(text, id) {
	return text
		.replace(/\]\(([A-Za-z0-9_]+)(\.md)?(#[^)]*)?\)/g, (match, name, _ext, hash) =>
			known.has(name) ? `](${route(name, hash ?? '')})` : match)
		.replace(/(\]\(|src=")(?:\.\/)?(images|assets)\//g, `$1${base}docs-media/${id}/$2/`);
}

rmSync(pages, { recursive: true, force: true });
mkdirSync(pages, { recursive: true });
rmSync(media, { recursive: true, force: true });
const shots = {};
for (const folder of folders) {
	for (const file of folder.files) {
		const name = basename(file, '.md');
		const raw = read(join(folder.dir, file)).replace(/\r\n/g, '\n');
		const heading = raw.match(/^#\s+(.+)$/m);
		const title = heading ? heading[1].trim() : name.replace(/_/g, ' ');
		const body = heading ? raw.replace(heading[0], '').replace(/^\s*\n/, '') : raw;
		const front = ['---', `title: ${JSON.stringify(title)}`, `editUrl: ${JSON.stringify(virtual.get(join(folder.dir, file))?.edit ?? folder.edit + file)}`, '---', ''];
		writeFileSync(join(pages, `${slugOf(name) || 'index'}.md`), front.join('\n') + relink(body, folder.id));
	}
	for (const kind of ['images', 'assets']) {
		if (existsSync(join(folder.dir, kind))) cpSync(join(folder.dir, kind), join(media, folder.id, kind), { recursive: true });
	}
	// Pictures of the real shell, made beside the pages that show them: copied, and listed for docs-previews.mjs.
	const made = join(folder.dir, 'shots', 'shots.json');
	if (existsSync(made)) {
		cpSync(join(folder.dir, 'shots'), join(media, folder.id, 'shots'), { recursive: true, filter: (path) => !path.endsWith('.json') });
		for (const [id, { alt, label, width, height, variants }] of Object.entries(JSON.parse(readFileSync(made, 'utf8')))) {
			if (shots[id]) console.warn(`sync-docs: shot ${id} is listed twice; ${folder.id}'s wins`);
			shots[id] = { alt, label, width, height, variants, at: `${base}docs-media/${folder.id}/shots/` };
		}
	}
}
writeFileSync(join(root, 'src', 'shots.generated.json'), JSON.stringify(shots, null, 2) + '\n');

// What each family's Settings holds, generated from its code (INIR_FAMILIES: an inir-hub checkout's families/).
const reference = settingsReference(resolve(process.env.INIR_FAMILIES ?? join(root, '..', 'inir-hub', 'families')));
for (const page of reference) {
	const body = page.text.replace(/^# .*\n\n/, '');
	writeFileSync(join(pages, `${slugOf(page.name)}.md`), ['---', `title: ${JSON.stringify(page.title)}`, 'editUrl: false', '---', '', body].join('\n'));
}

// Sidebar: groups in the order the base names them, each repo's pages added to the group it names.
const sidebar = [];
const groupOf = (label) => sidebar.find((group) => group.label === label) ?? sidebar[sidebar.push({ label, items: [] }) - 1];
const add = (label, name, text) => {
	if (known.has(name) && !sidebar.some((group) => group.items.some((item) => item.link === link(name)))) groupOf(label).items.push({ label: text, link: link(name) });
};
const titleOf = (folder, name) => read(join(folder.dir, `${name}.md`)).match(/^#\s+(.+)$/m)?.[1].trim() ?? name;
// The base's groups set the order, empty ones included: the families fill theirs from the hub.
for (const group of folders[0].groups ?? []) groupOf(group.label);
for (const folder of folders) {
	if (folder.groups) {
		for (const group of folder.groups) for (const name of group.pages) {
			if (folder.files.includes(`${name}.md`)) add(group.label, name, group.labels?.[name] ?? titleOf(folder, name));
		}
		continue;
	}
	const legacy = join(folder.dir, '_Sidebar.md');
	if (!existsSync(legacy)) continue;
	let label = null;
	for (const line of readFileSync(legacy, 'utf8').split('\n')) {
		const head = line.match(/^###\s+(.+)$/);
		if (head) { label = head[1].trim(); continue; }
		const item = line.match(/^\s*-\s*\[([^\]]+)\]\(([A-Za-z0-9_]+)(?:\.md)?\)/);
		if (item && label) add(label, item[2] === 'Home' ? 'index' : item[2], item[1]);
	}
}
for (const page of reference) groupOf('Reference').items.push({ label: page.title, link: link(page.name) });
for (let i = sidebar.length - 1; i >= 0; i--) if (!sidebar[i].items.length) sidebar.splice(i, 1);
const files = folders.flatMap((folder) => folder.files);
const rest = files.map((file) => basename(file, '.md')).filter((name) => slugOf(name) && !sidebar.some((group) => group.items.some((item) => item.link === link(name))));
if (rest.length) sidebar.push({ label: 'More', collapsed: true, items: rest.sort().map((name) => ({ label: name.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase()), link: link(name) })) });
writeFileSync(join(root, 'src', 'sidebar.generated.json'), JSON.stringify(sidebar, null, 2) + '\n');

// The landing page, /changelog and the families row follow iNiR's own files: VERSION and every section of
// CHANGELOG.md beside docs/ (a section's bold line names the iRiS version). Without them the release is left out.
const versionFile = join(source, '..', 'VERSION');
const changelogFile = join(source, '..', 'CHANGELOG.md');
const release = { version: existsSync(versionFile) ? readFileSync(versionFile, 'utf8').trim() : null, releases: [] };
const plain = (text) => text.replace(/\*\*?([^*]+)\*\*?/g, '$1').replace(/`([^`]+)`/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim();
const escape = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// The changelog page shows items as written: code, bold and links, nothing else.
const inline = (text) => escape(text).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
	.replace(/\[([^\]]+)\]\((https?:[^)\s"]+)\)/g, '<a href="$2">$1</a>');
const sentence = (text) => {
	const first = plain(text.replace(/\s*\(`inir [^)]*\)/g, '')).split(/(?<=\.)\s/)[0];
	// Sentence case, unless the line opens on a name with its own casing (iRiS) or a command.
	return /^[a-z]+\b/.test(first) && !text.startsWith('`') ? first.charAt(0).toUpperCase() + first.slice(1) : first;
};
if (existsSync(changelogFile)) {
	const log = readFileSync(changelogFile, 'utf8').replace(/\r\n/g, '\n');
	const heads = [...log.matchAll(/^## \[(\d+\.\d+\.\d+)\] - (\d{4}-\d{2}-\d{2})$/gm)];
	heads.forEach((head, i) => {
		const section = log.slice(head.index + head[0].length, heads[i + 1]?.index ?? log.length);
		const title = section.match(/^\*\*(.+)\*\*$/m)?.[1] ?? null;
		const summary = section.split('\n\n').map((part) => part.trim()).find((part) => part && !/^[#>*-]/.test(part)) ?? null;
		const list = (name) => (section.split(/^### /m).find((part) => part.startsWith(`${name}\n`)) ?? '')
			.split('\n').filter((line) => line.startsWith('- ')).map((line) => {
				const [, bold, rest] = line.match(/^- \*\*(.+?)\*\*:?\s*(.*)$/) ?? [];
				return bold ? { name: plain(bold), text: sentence(rest), html: inline(rest) } : { name: null, text: sentence(line.slice(2)), html: inline(line.slice(2)) };
			});
		release.releases.push({
			version: head[1], date: head[2], title, iris: title?.match(/iRiS (\d+(?:\.\d+)*)/)?.[1] ?? null,
			summary: summary && plain(summary), added: list('Added'), changed: list('Changed'), fixed: list('Fixed'),
		});
	});
}
release.version ??= release.releases[0]?.version ?? null;
writeFileSync(join(root, 'src', 'release.generated.json'), JSON.stringify(release, null, 2) + '\n');

// /hub is this site's page over the catalogue `inir hub build` writes (INIR_HUB: its --out folder). Everything but
// its own gallery page is served as built, under public/hub, so clients keep reading inir.space/hub/index.json.
const hubSource = process.env.INIR_HUB && resolve(process.env.INIR_HUB);
const hubOut = join(root, 'public', 'hub');
if (hubSource && existsSync(join(hubSource, 'index.json'))) {
	rmSync(hubOut, { recursive: true, force: true });
	cpSync(hubSource, hubOut, { recursive: true, filter: (path) => path !== join(hubSource, 'index.html') });
}

console.log(`sync-docs: ${files.length} pages, ${sidebar.length} sidebar groups from ${folders.map((folder) => folder.id).join(', ')}` +
	(release.version ? `, release ${release.version}, ${release.releases.length} changelog sections` : ', no release notes') +
	(existsSync(join(hubOut, 'index.json')) ? ', hub catalogue' : ', no hub catalogue (set INIR_HUB)'));
