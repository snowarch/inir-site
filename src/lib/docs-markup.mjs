// A Sätteri hast pass over iNiR's docs. The markdown stays plain for GitHub; here a Settings path becomes crumbs, a
// shortcut becomes keys, a line that starts with a family's name is tagged with it, and a `<!-- preview ... -->`
// comment becomes a small picture of the screen with the part the page talks about lit (docs-previews.mjs).
import { preview } from './docs-previews.mjs';

const FAMILIES = { material: 'ii', 'material ii': 'ii', waffle: 'waffle', iris: 'iris' };
const famOf = (word) => FAMILIES[String(word ?? '').trim().toLowerCase()] ?? null;

const el = (tagName, properties, children = []) => ({ type: 'element', tagName, properties, children });
const text = (value) => ({ type: 'text', value });

// "iRiS Settings › Island › Layout", "Settings › Wallpaper › Source (Material)". A segment ends at punctuation; a
// trailing "(Waffle)" names the family instead of being part of the label. Plain "Settings" is Material's.
const PATH = /(?:\b(Material|Waffle|iRiS) )?\bSettings((?: › [^›.,;:\n]+?)+)(?=$|[.,;:](?:\s|$)| › |\s*\n)/g;
function crumbs(head, rest) {
	let segs = rest.split(' › ').slice(1).map((s) => s.trim());
	let fam = famOf(head) ?? 'ii';
	const last = segs.at(-1).match(/^(.*?)\s*\((Material|Waffle|iRiS)\)$/);
	if (last) { segs[segs.length - 1] = last[1]; fam = famOf(last[2]); }
	// An unclosed "(" belongs to the sentence, not the label.
	segs = segs.map((s) => (s.split('(').length > s.split(')').length ? s.slice(0, s.indexOf('(')).trim() : s)).filter(Boolean);
	const root = head ? `${head} Settings` : 'Settings';
	const kids = [el('span', { className: ['sp-root'] }, [text(root)])];
	for (const s of segs) kids.push(el('i', { ariaHidden: 'true' }, [text('›')]), el('span', {}, [text(s)]));
	return el('span', { className: ['sp'], dataFam: fam }, kids);
}

const KEY = /\b(?:Super|Ctrl|Alt|Shift|Mod)(?:\+(?:Super|Ctrl|Alt|Shift|Mod))*\+(?:Page ?Down|Page ?Up|Mouse wheel(?: left| right| up| down)?|Print|Space|Tab|Return|Escape|Comma|Slash|Minus|Equal|Home|End|Left|Right|Up|Down|F\d{1,2}|[A-Z0-9](?![a-z])|[,./\[\]=-])/g;
function keys(combo) {
	const kids = [];
	combo.split(/\+(?=.)/).forEach((part, i) => {
		if (i) kids.push(el('i', { ariaHidden: 'true' }, [text('+')]));
		kids.push(el('kbd', {}, [text(part)]));
	});
	return el('kbd', { className: ['keys'] }, kids);
}

const whole = (re, value) => {
	const found = [...value.trim().matchAll(re)];
	return found.length === 1 && found[0][0] === value.trim() ? found[0] : null;
};

// Splits a text into plain runs and built nodes, paths first, then keys in what is left.
function rebuild(value) {
	const out = [];
	let changed = false;
	const pass = (value, re, build, rest) => {
		let at = 0;
		for (const m of value.matchAll(re)) {
			if (m.index > at) rest(value.slice(at, m.index));
			out.push(build(m));
			changed = true;
			at = m.index + m[0].length;
		}
		if (at < value.length) rest(value.slice(at));
	};
	// Outside bold, a label that runs on past five words is the sentence carrying on: no crumbs.
	const prose = (m) => m[2].split(' › ').at(-1).trim().split(/\s+/).length > 5;
	const paths = (run, rest) => {
		let at = 0;
		for (const m of run.matchAll(PATH)) {
			if (prose(m)) continue;
			if (m.index > at) rest(run.slice(at, m.index));
			out.push(crumbs(m[1], m[2]));
			changed = true;
			at = m.index + m[0].length;
		}
		if (at < run.length) rest(run.slice(at));
	};
	paths(value, (run) => pass(run, KEY, (m) => keys(m[0]), (plain) => out.push(text(plain))));
	return changed ? out : null;
}

const SKIP = new Set(['code', 'pre', 'kbd', 'a', 'script', 'style', 'figure', 'h1', 'h2', 'h3', 'h4']);
function skipped(node, ctx) {
	for (let p = ctx.parent(node); p; p = ctx.parent(p)) {
		if (p.type !== 'element') return false;
		if (SKIP.has(p.tagName)) return true;
		if (p.tagName === 'strong' && (whole(PATH, ctx.textContent(p)) || whole(KEY, ctx.textContent(p)))) return true;
	}
	return false;
}

// "Material: ...", "**Waffle**: ...", "In iRiS, ..." at the start of a list item or paragraph: that line is one family's.
const LEAD = /^\s*(?:In )?(Material(?: ii)?|Waffle|iRiS)\b(?: Settings)?\s*(?:\([^)]*\))?\s*[:,]/;

function comment(value) {
	const body = String(value ?? '').replace(/^\s*<!--|-->\s*$/g, '').trim();
	if (!/^preview\b/.test(body)) return null;
	const html = preview(body.slice(7).trim());
	return html ? { type: 'raw', value: html } : null;
}

const plugin = {
	name: 'inir-docs-markup',
	element: [
		{
			// A bold path or a bold shortcut is the whole thing: crumbs or keys, no bold around them.
			filter: ['strong'],
			visit(node, ctx) {
				const t = ctx.textContent(node);
				const path = whole(PATH, t);
				if (path) return ctx.replaceNode(node, crumbs(path[1], path[2]));
				if (whole(KEY, t)) ctx.replaceNode(node, keys(t.trim()));
			},
		},
		{
			filter: ['li', 'p'],
			visit(node, ctx) {
				const lead = ctx.textContent(node).match(LEAD);
				if (lead) ctx.setProperty(node, 'dataFam', famOf(lead[1]));
			},
		},
	],
	text(node, ctx) {
		if (skipped(node, ctx)) return;
		const built = rebuild(node.value);
		if (built) ctx.replaceNode(node, built);
	},
	comment(node, ctx) {
		const figure = comment(`<!--${node.value}-->`);
		if (figure) ctx.replaceNode(node, figure);
	},
	raw(node, ctx) {
		const figure = comment(node.value);
		if (figure) ctx.replaceNode(node, figure);
	},
};

// Pushed into Astro's Markdown processor beside Starlight's own plugins, for iNiR's docs only.
export default function docsMarkup() {
	return {
		name: 'inir-docs-markup',
		hooks: {
			'astro:config:setup': ({ config }) => {
				config.markdown.processor.options.hastPlugins.push(({ fileURL }) =>
					String(fileURL ?? '').includes('/src/content/docs/') ? plugin : undefined);
			},
		},
	};
}
