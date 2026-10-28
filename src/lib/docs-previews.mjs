// `<!-- preview shot=iris-edge -->` in a docs page becomes a picture of the real shell, made by iNiR's own tooling
// and kept beside the page (each docs folder's shots/, listed in src/shots.generated.json by sync-docs). A shot with
// a choice holds one picture per option: the buttons under it switch them, and in view it walks through them by
// itself, like the previews in iRiS Settings. `<!-- preview parts -->` is the map of iNiR's parts.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

let listed;
const shots = () => {
	const file = join(process.cwd(), 'src', 'shots.generated.json');
	return (listed ??= existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {});
};

function shot(id) {
	const s = shots()[id];
	if (!s?.variants?.length) return null;
	const fams = [...new Set(s.variants.map((v) => v.family))];
	const pictures = s.variants.map((v, i) =>
		`<img src="${esc(s.at + v.file)}" alt="${esc(v.label ? `${s.alt}: ${v.label}` : s.alt)}" width="${s.width}" height="${s.height}"`
		+ ` decoding="async" loading="lazy"${i ? ' class="" aria-hidden="true"' : ' class="on"'}>`).join('');
	const buttons = s.variants.length > 1
		? `<div class="pv-seg" role="group" aria-label="${esc(s.label)}"><span>${esc(s.label)}</span>`
			+ s.variants.map((v, i) => `<button type="button" data-fam="${esc(v.family)}" aria-pressed="${!i}">${esc(v.label)}</button>`).join('')
			+ '</div>'
		: '';
	return `<figure class="pv pv-shot not-content"${fams.length === 1 ? ` data-fam="${esc(fams[0])}"` : ''}>`
		+ `<div class="pv-frame" tabindex="0" role="button" aria-label="Show full size">${pictures}<i class="pv-run" aria-hidden="true"></i></div>`
		+ `<figcaption><span class="pv-name">${esc(s.alt)}</span>${buttons}</figcaption></figure>`;
}

// The parts of iNiR stacked as they run: the looks on top, Niri underneath, the command and inir.space beside them.
const PARTS = [
	{ id: 'ii', name: 'Material', line: 'Family', at: '~/.local/share/inir/plugins/ii', by: 'inir-hub' },
	{ id: 'waffle', name: 'Waffle', line: 'Family', at: '~/.local/share/inir/plugins/waffle', by: 'inir-hub' },
	{ id: 'iris', name: 'iRiS', line: 'Family', at: '~/.local/share/inir/plugins/iris', by: 'inir-hub' },
	{ id: 'more', name: 'Themes, widgets, web apps', line: 'Plugins', at: '~/.config/inir', by: 'inir-hub' },
	{ id: 'base', name: 'The base', line: 'Services, Settings, IPC, setup, update, wizard', at: '~/.config/quickshell/inir', by: 'iNiR' },
	{ id: 'qsrs', name: 'qs-rs', line: 'Runtime: loads and draws the shell', at: '~/.local/share/inir/runtime', by: 'qs-rs' },
	{ id: 'accel', name: 'inir-accel', line: 'Helpers: colours, thumbnails, images', at: '~/.local/share/inir/accel', by: 'inir-accel' },
	{ id: 'niri', name: 'Niri', line: 'Compositor: your windows', at: '~/.config/niri', by: 'your distro' },
	{ id: 'cli', name: 'inir', line: 'The command you type', at: '~/.local/share/inir/cli/inir', by: 'inir-cli' },
	{ id: 'space', name: 'inir.space', line: 'Hub catalogue, releases, docs', at: 'fetched by setup and inir update', by: 'inir-site' },
];

function parts() {
	const cells = PARTS.map((p) => `<div class="pt-${p.id}" tabindex="0" data-at="${esc(p.at)}" data-by="${esc(p.by)}" aria-label="${esc(`${p.name}: ${p.line}. ${p.at}, from ${p.by}`)}">`
		+ `<b>${esc(p.name)}</b><span>${esc(p.line)}</span></div>`).join('');
	return `<figure class="pv pv-parts"><div class="pt">${cells}</div>`
		+ `<figcaption><span class="pv-name" data-pt-info aria-live="polite">Point at a part to see where it lives</span></figcaption></figure>`;
}

export function preview(args) {
	const words = args.split(/\s+/).filter(Boolean);
	if (words[0] === 'parts') return parts();
	const id = words.find((w) => w.startsWith('shot='))?.slice(5);
	return id ? shot(id) : null;
}
