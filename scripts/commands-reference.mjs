// The `inir` command's page, read at build time from the binary itself: `inir __commands` prints what `inir help`
// shows (inir-cli's command table), so the page follows the code. INIR_CLI names the binary; CI installs inir-cli
// and finds it on PATH. A binary too old to answer leaves the page out.
import { execFileSync } from 'node:child_process';

const cell = (text) => text.replace(/\|/g, '\\|');

function flagText(flag) {
	const takes = flag.values?.length ? ` <${flag.values.join('|')}>` : flag.value ? ` <${flag.value}>` : '';
	return `\`${cell(flag.name + takes)}\``;
}

// -c and --config, -y and --yes: one row when two flags say the same.
function flagRows(flags) {
	const rows = [];
	for (const f of flags ?? []) {
		const same = rows.find((row) => row.desc === f.desc && row.value === f.value);
		if (same) same.names.push(f);
		else rows.push({ desc: f.desc, value: f.value, names: [f] });
	}
	return rows.map((row) => ({ text: row.names.map(flagText).join(', '), desc: row.desc }));
}

export function commandsReference(bin = process.env.INIR_CLI ?? 'inir') {
	let groups;
	try {
		groups = JSON.parse(execFileSync(bin, ['__commands'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 10000 }));
	} catch {
		return null;
	}
	if (!Array.isArray(groups) || !groups.length) return null;
	const out = ['# The inir command', '',
		'Everything you can type after `inir`, read from the command itself each time this site is built. `inir help` shows the same list, and `inir <command> --help` the details of one. Shell actions (`inir <target> <function>`) are on the [IPC](IPC.md) page.',
		''];
	for (const { title, commands } of groups) {
		out.push(`## ${title}`, '');
		for (const c of commands) {
			out.push(`### inir ${c.name}`, '', c.desc, '');
			if (c.flags?.length) {
				out.push('| Option | What it does |', '| --- | --- |');
				for (const row of flagRows(c.flags)) out.push(`| ${row.text} | ${cell(row.desc)} |`);
				out.push('');
			}
			if (c.subs?.length) {
				out.push(`| \`inir ${c.name}\` | What it does |`, '| --- | --- |');
				for (const s of c.subs) {
					const opts = flagRows(s.flags).map((row) => row.text).join(', ');
					out.push(`| \`${cell(s.name)}\` | ${cell(s.desc)}${opts ? `<br>${opts}` : ''} |`);
				}
				out.push('');
			}
		}
	}
	return out.join('\n');
}
