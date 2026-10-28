// Brings iNiR's docs/ into the site. The docs live in the iNiR repository and change with the shell; this
// script only adapts them: a title from the first heading, wiki links to site routes, media paths, and the
// sidebar from docs/_Sidebar.md. Nothing here is edited by hand after a sync.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const source = resolve(process.env.INIR_DOCS ?? join(root, '..', 'inir', 'docs'));
const base = (process.env.SITE_BASE ?? '/').replace(/\/?$/, '/');
const repo = 'https://github.com/snowarch/iNiR';
const pages = join(root, 'src', 'content', 'docs', 'docs');
const media = join(root, 'public', 'docs-media');

if (!existsSync(source)) {
	console.error(`sync-docs: no docs at ${source}. Set INIR_DOCS to an iNiR checkout's docs/ folder.`);
	process.exit(1);
}

const files = readdirSync(source).filter((name) => name.endsWith('.md') && !name.startsWith('_'));
const slugOf = (name) => (name === 'index' || name === 'Home' ? '' : name.toLowerCase().replace(/_/g, '-'));
const known = new Set(files.map((file) => basename(file, '.md')).concat('Home'));
const route = (name, hash = '') => `${base}docs/${slugOf(name) ? slugOf(name) + '/' : ''}${hash}`;

function relink(text) {
	return text
		.replace(/\]\(([A-Za-z0-9_]+)(\.md)?(#[^)]*)?\)/g, (match, name, _ext, hash) =>
			known.has(name) ? `](${route(name, hash ?? '')})` : match)
		.replace(/(\]\(|src=")(?:\.\/)?(images|assets)\//g, `$1${base}docs-media/$2/`)
		.replace(/\]\(\.\.\/([^)\s]+)\)/g, `](${repo}/blob/main/$1)`);
}

rmSync(pages, { recursive: true, force: true });
mkdirSync(pages, { recursive: true });
for (const file of files) {
	const name = basename(file, '.md');
	const raw = readFileSync(join(source, file), 'utf8').replace(/\r\n/g, '\n');
	const heading = raw.match(/^#\s+(.+)$/m);
	const title = heading ? heading[1].trim() : name.replace(/_/g, ' ');
	const body = heading ? raw.replace(heading[0], '').replace(/^\s*\n/, '') : raw;
	const front = ['---', `title: ${JSON.stringify(title)}`, `editUrl: ${JSON.stringify(`${repo}/edit/main/docs/${file}`)}`, '---', ''];
	const out = join(pages, `${slugOf(name) || 'index'}.md`);
	writeFileSync(out, front.join('\n') + relink(body));
}

rmSync(media, { recursive: true, force: true });
for (const folder of ['images', 'assets']) {
	if (existsSync(join(source, folder))) cpSync(join(source, folder), join(media, folder), { recursive: true });
}

// Sidebar: `### Group` headings and `- [Label](TARGET)` items, in the order the wiki shows them.
const sidebar = [];
const sidebarFile = join(source, '_Sidebar.md');
if (existsSync(sidebarFile)) {
	let group = null;
	for (const line of readFileSync(sidebarFile, 'utf8').split('\n')) {
		const head = line.match(/^###\s+(.+)$/);
		if (head) { group = { label: head[1].trim(), items: [] }; sidebar.push(group); continue; }
		const item = line.match(/^\s*-\s*\[([^\]]+)\]\(([A-Za-z0-9_]+)(?:\.md)?\)/);
		if (item && group && known.has(item[2])) group.items.push({ label: item[1], link: `/docs/${slugOf(item[2]) ? slugOf(item[2]) + '/' : ''}` });
	}
}
const listed = new Set(sidebar.flatMap((group) => group.items.map((item) => item.link)));
const rest = files.map((file) => basename(file, '.md')).filter((name) => slugOf(name) && !listed.has(`/docs/${slugOf(name)}/`));
if (rest.length) sidebar.push({ label: 'More', collapsed: true, items: rest.sort().map((name) => ({ label: name.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase()), link: `/docs/${slugOf(name)}/` })) });
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

console.log(`sync-docs: ${files.length} pages, ${sidebar.length} sidebar groups from ${source}` +
	(release.version ? `, release ${release.version}, ${release.releases.length} changelog sections` : ', no release notes') +
	(existsSync(join(hubOut, 'index.json')) ? ', hub catalogue' : ', no hub catalogue (set INIR_HUB)'));
