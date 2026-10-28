// Every IPC target the shell answers, read at build time from the base's `scripts/lib/ipc.json`. That file is made
// from the `///` comments on each IpcHandler in the shell's code (the same list `inir help` and completion read), so
// the page follows the code. It fills the `<!-- ipc reference -->` region of the base's IPC.md.
import { existsSync, readFileSync } from 'node:fs';

const FAMILIES = { shared: 'Every family', ii: 'Material', waffle: 'Waffle', iris: 'iRiS' };
const cell = (text) => text.replace(/\|/g, '\\|').replace(/\n/g, ' ');

export function ipcReference(file) {
	if (!existsSync(file)) return null;
	const { targets } = JSON.parse(readFileSync(file, 'utf8'));
	const rank = (f) => (f in FAMILIES ? Object.keys(FAMILIES).indexOf(f) : 99);
	const families = [...new Set(targets.map((t) => t.family))].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
	const out = [];
	for (const family of families) {
		out.push(`### ${family === 'shared' ? FAMILIES.shared : `${FAMILIES[family] ?? family} only`}`, '');
		for (const t of targets.filter((target) => target.family === family)) {
			out.push(`#### ${t.name}`, '');
			if (t.description) out.push(t.description, '');
			if (t.functions.length) {
				out.push(`| \`inir ${t.name}\` | What it does |`, '| --- | --- |');
				for (const fn of t.functions) {
					const call = [fn.name, ...fn.args.map((arg) => `<${arg}>`)].join(' ');
					out.push(`| \`${cell(call)}\` | ${cell(fn.description || '')} |`);
				}
				out.push('');
			}
			if (t.notes) out.push(t.notes, '');
		}
	}
	return out.join('\n');
}

// The page's own text around the region stays as written; an iNiR with no ipc.json keeps what it has there.
export function withIpcReference(text, file) {
	const list = ipcReference(file);
	if (!list) return text;
	return text.replace(/<!-- ipc reference -->[^]*?<!-- \/ipc reference -->/, () => list);
}
