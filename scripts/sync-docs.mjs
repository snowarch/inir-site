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

// The landing page names the current release and what it added, from VERSION and the newest section of
// CHANGELOG.md beside docs/. Without them the page leaves the release out.
const release = { version: null, date: null, title: null, summary: null, added: [] };
const versionFile = join(source, '..', 'VERSION');
const changelogFile = join(source, '..', 'CHANGELOG.md');
if (existsSync(versionFile)) release.version = readFileSync(versionFile, 'utf8').trim();
if (existsSync(changelogFile)) {
	const log = readFileSync(changelogFile, 'utf8').replace(/\r\n/g, '\n');
	const head = log.match(/^## \[(\d+\.\d+\.\d+)\] - (\d{4}-\d{2}-\d{2})$/m);
	if (head) {
		const after = log.slice(head.index + head[0].length);
		const next = after.search(/^## \[/m);
		const section = next < 0 ? after : after.slice(0, next);
		const plain = (text) => text.replace(/\*\*?([^*]+)\*\*?/g, '$1').replace(/`([^`]+)`/g, '$1').trim();
		release.version ??= head[1];
		release.date = head[2];
		release.title = section.match(/^\*\*(.+)\*\*$/m)?.[1] ?? null;
		release.summary = section.split('\n\n').map((part) => part.trim())
			.find((part) => part && !/^[#>*-]/.test(part)) ?? null;
		const added = (section.split(/^### /m).find((part) => part.startsWith('Added\n')) ?? '');
		for (const item of added.split('\n').filter((line) => line.startsWith('- **'))) {
			const [, name, text] = item.match(/^- \*\*(.+?)\*\*:?\s*(.*)$/) ?? [];
			if (!name) continue;
			const command = text.match(/`(inir [^`]+)`/)?.[1] ?? null;
			const first = plain(text.replace(/\s*\(`inir [^)]*\)/g, '')).split(/(?<=\.)\s/)[0];
			// Sentence case, unless the line opens on a name with its own casing (iRiS) or a command.
			const upper = /^[a-z]+\b/.test(first) && !text.startsWith('`');
			release.added.push({ name: plain(name), text: upper ? first.charAt(0).toUpperCase() + first.slice(1) : first, command });
		}
		if (release.summary) release.summary = plain(release.summary);
	}
}
writeFileSync(join(root, 'src', 'release.generated.json'), JSON.stringify(release, null, 2) + '\n');

console.log(`sync-docs: ${files.length} pages, ${sidebar.length} sidebar groups from ${source}` +
	(release.version ? `, release ${release.version}` : ', no release notes'));
