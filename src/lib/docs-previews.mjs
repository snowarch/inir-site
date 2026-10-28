// `<!-- preview iris island choose=edge -->` in a docs page becomes a small screen drawn in the site's lines: the
// family's own layout over Niri's columns, the parts the page talks about lit, and the setting's real choices under
// it, like the previews in iRiS Settings. Pictures are CSS (docs-previews.css); docs-previews.ts runs the choices.

const NAMES = { ii: 'Material', waffle: 'Waffle', iris: 'iRiS' };

// What each family puts on screen; `only` parts are drawn when a page lights them.
const SCENES = {
	ii: {
		parts: ['bar', 'dock'],
		only: ['sidebar-left', 'sidebar-right', 'overview', 'notifications', 'osd', 'desktop', 'settings', 'lock', 'wallpaper'],
		state: { bar: 'top' },
	},
	waffle: {
		parts: ['taskbar'],
		only: ['start', 'action-center', 'notifications', 'widgets', 'desktop', 'settings', 'lock', 'wallpaper'],
		state: { apps: 'center', taskbar: 'bottom' },
	},
	iris: {
		parts: ['strip', 'island', 'dock', 'pieces'],
		only: ['page', 'control', 'spotlight', 'desktop', 'settings', 'lock', 'wallpaper', 'orbit'],
		state: { edge: 'top', layout: 'island', dock: 'auto' },
	},
};

const LABELS = {
	bar: 'Bar', dock: 'Dock', 'sidebar-left': 'Left sidebar', 'sidebar-right': 'Right sidebar', overview: 'Overview',
	notifications: 'Notifications', osd: 'On-screen display', desktop: 'Desktop widgets', settings: 'Settings', lock: 'Lock screen',
	wallpaper: 'Wallpaper', taskbar: 'Taskbar', start: 'Start menu', 'action-center': 'Action Center', widgets: 'Widgets',
	island: 'Island', pieces: 'Pieces', page: 'Island page', control: 'Control Center', spotlight: 'Spotlight', orbit: 'Orbit',
};

// The setting each choice stands for, with the labels Settings shows.
const CHOICES = {
	ii: { bar: { label: 'Bar position', values: { top: 'Top', bottom: 'Bottom', left: 'Left', right: 'Right' } } },
	waffle: {
		apps: { label: 'Left-align apps', values: { center: 'Off', left: 'On' } },
		taskbar: { label: 'Bottom position', values: { bottom: 'On', top: 'Off' } },
	},
	iris: {
		edge: { label: 'Screen edge', values: { top: 'Top', bottom: 'Bottom', left: 'Left', right: 'Right' } },
		layout: { label: 'Island layout', values: { island: 'Island', left: 'Left', right: 'Right', full: 'Full width', menubar: 'Menu bar' } },
		dock: { label: 'Dock edge', values: { auto: 'Auto', top: 'Top', bottom: 'Bottom', left: 'Left', right: 'Right' } },
	},
};

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function screen(scene, lit, state) {
	const def = SCENES[scene];
	const parts = [...def.parts, ...def.only.filter((p) => lit.includes(p))];
	const attrs = Object.entries({ ...def.state, ...state }).map(([k, v]) => ` data-${k}="${esc(v)}"`).join('');
	const items = parts.map((p) => `<i class="pv-${p}${lit.includes(p) ? ' on' : ''}"></i>`).join('');
	return `<div class="pv-screen" data-scene="${scene}"${attrs} aria-hidden="true"><i class="pv-cols"><b></b><b></b><b></b></i>${items}</div>`;
}

function families(lit) {
	const cells = Object.keys(SCENES).map((f) =>
		`<div class="pv-fam" data-fam="${f}">${screen(f, lit, {})}<span class="pv-name">${NAMES[f]}</span></div>`).join('');
	return `<figure class="pv pv-three">${cells}</figure>`;
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
	const cells = PARTS.map((p) => `<div class="pt-${p.id}" tabindex="0" data-at="${esc(p.at)}" data-by="${esc(p.by)}">`
		+ `<b>${esc(p.name)}</b><span>${esc(p.line)}</span></div>`).join('');
	return `<figure class="pv pv-parts"><div class="pt">${cells}</div>`
		+ `<figcaption><span class="pv-name" data-pt-info>Point at a part to see where it lives</span></figcaption></figure>`;
}

export function preview(args) {
	const words = args.split(/\s+/).filter(Boolean);
	const scene = words.shift();
	const opts = Object.fromEntries(words.filter((w) => w.includes('=')).map((w) => w.split('=')));
	const lit = words.filter((w) => !w.includes('=')).flatMap((w) => w.split(','));
	if (scene === 'families') return families(lit);
	if (scene === 'parts') return parts();
	if (!SCENES[scene]) return null;

	const state = Object.fromEntries(Object.keys(SCENES[scene].state).filter((k) => opts[k]).map((k) => [k, opts[k]]));
	const choose = (opts.choose ?? '').split(',').filter((k) => CHOICES[scene]?.[k]);
	const title = [NAMES[scene], ...lit.map((p) => LABELS[p] ?? p)].join(' · ');
	const groups = choose.map((key) => {
		const choice = CHOICES[scene][key];
		const current = state[key] ?? SCENES[scene].state[key];
		const buttons = Object.entries(choice.values).map(([v, label]) =>
			`<button type="button" data-v="${esc(v)}" aria-pressed="${v === current}">${esc(label)}</button>`).join('');
		return `<div class="pv-seg" role="group" aria-label="${esc(choice.label)}" data-key="${esc(key)}"><span>${esc(choice.label)}</span>${buttons}</div>`;
	}).join('');
	return `<figure class="pv" data-fam="${scene === 'ii' || scene === 'waffle' || scene === 'iris' ? scene : ''}">${screen(scene, lit, state)}`
		+ `<figcaption><span class="pv-name">${esc(title)}</span>${groups}</figcaption></figure>`;
}
