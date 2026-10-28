// Every shortcut iNiR ships, read from Niri's binds file in the base (`defaults/niri/config.d/70-binds.kdl`) at build
// time. The comment right above a bind, or above a group of binds with no blank line between them, says what it does;
// a group is one row. A commented-out bind takes the comment above it along; a bind with no comment shows its action.
// A line that starts a bind and can't be read stops the build: no bind is ever left out in silence.
import { existsSync, readFileSync } from 'node:fs';

const WORDS = {
	Mod: 'Super', Page_Down: 'Page Down', Page_Up: 'Page Up', Return: 'Return', BracketLeft: '[', BracketRight: ']',
	WheelScrollDown: 'Mouse wheel down', WheelScrollUp: 'Mouse wheel up', WheelScrollLeft: 'Mouse wheel left',
	WheelScrollRight: 'Mouse wheel right', XF86AudioRaiseVolume: 'Volume up', XF86AudioLowerVolume: 'Volume down',
	XF86AudioMute: 'Mute', XF86AudioMicMute: 'Mic mute', XF86MonBrightnessUp: 'Brightness up',
	XF86MonBrightnessDown: 'Brightness down', XF86AudioPlay: 'Play', XF86AudioPause: 'Pause', XF86AudioNext: 'Next',
	XF86AudioPrev: 'Previous',
};
const BIND = /^\s*([A-Za-z0-9_]+(?:\+[A-Za-z0-9_]+)*)((?:\s+[a-z-]+=(?:"[^"]*"|[^\s{]+))*)\s*\{\s*([^]*?)\s*\}\s*$/;
const OPENS = /^\s*[A-Za-z0-9_]+(?:\+[A-Za-z0-9_]+)*(?:\s+[a-z-]+=(?:"[^"]*"|[^\s{]+))*\s*\{/;
const key = (combo) => combo.split('+').map((part) => WORDS[part] ?? part).join('+');
const said = (action) => action.replace(/;$/, '').replace(/^spawn\s+/, '').replace(/"/g, '');

// Super+1, Super+2 ... Super+9 read as "Super+1 to Super+9".
function keys(list) {
	const out = [];
	for (const k of list) {
		const prev = out.at(-1);
		const [, stem, n] = k.match(/^(.*\+)(\d)$/) ?? [];
		const run = prev?.match(/^(.*?\+)(\d)(?: to \1(\d))?$/);
		if (stem && run && run[1] === stem && Number(run[3] ?? run[2]) + 1 === Number(n)) out[out.length - 1] = `${stem}${run[2]} to ${stem}${n}`;
		else out.push(k);
	}
	return out.join(' · ');
}

export function keybindsReference(file) {
	if (!existsSync(file)) return null;
	const sections = [];
	let section = null, note = [], group = null;
	const lines = readFileSync(file, 'utf8').split('\n');
	let open = '';
	lines.forEach((line, i) => {
		// A bind written over several lines is read once its brace closes.
		if (open) { open += ` ${line.trim()}`; if (!line.includes('}')) return; line = open; open = ''; }
		else if (/^\s*(binds|recent-windows)\s*\{\s*$|^\s*\}\s*$/.test(line)) { note = []; group = null; return; }
		else if (OPENS.test(line) && !line.includes('}') && section) { open = line.trim(); return; }
		const text = line.trim();
		if (/^\/\/\s*═+/.test(text)) {
			const title = lines[i + 1]?.trim().replace(/^\/\/\s*/, '');
			if (title && /^\/\/\s*═+/.test(lines[i + 2]?.trim() ?? '')) sections.push(section = { title, rows: [] });
			note = []; group = null;
			return;
		}
		if (text.startsWith('//')) {
			const body = text.replace(/^\/\/\s?/, '');
			if (section?.title === body) return;
			if (BIND.test(body)) { note = []; group = null; return; }
			note.push(body);
			group = null;
			return;
		}
		if (!text) { note = []; group = null; return; }
		const bind = text.match(BIND);
		if (!section) return;
		if (!bind) throw new Error(`keybinds: can't read line ${i + 1} of ${file}: ${text}`);
		const described = note.join(' ');
		if (group && described === group.text && described) group.keys.push(key(bind[1]));
		else section.rows.push(group = { keys: [key(bind[1])], text: described || `\`${said(bind[3])}\`` });
		note = described ? note : [];
	});
	const body = ['# Keybinds', '',
		"Every shortcut that ships with iNiR, read from its Niri binds each time this site is built. Super is the Windows key; Niri's config calls it `Mod`.",
		'',
		'Your own binds go in `~/.config/niri/config.d/90-user-extra.kdl`, which updates never touch. **Settings › Shortcuts** (Material), **Waffle Settings › Shortcuts** and **iRiS Settings › Home › Keyboard shortcuts** list and add them too, and `inir bind` does it from a terminal.',
		''];
	for (const { title, rows } of sections.filter((s) => s.rows.length)) {
		body.push(`## ${title}`, '', '| Keys | What it does |', '| --- | --- |');
		for (const row of rows) body.push(`| ${keys(row.keys)} | ${row.text} |`);
		body.push('');
	}
	return body.join('\n');
}
