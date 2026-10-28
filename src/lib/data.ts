// What every page reads at build time: the release notes sync-docs.mjs parsed from VERSION and CHANGELOG.md, and
// the hub catalogue it copied to public/hub. Either can be missing on a local build; pages leave that part out.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import release from '../release.generated.json';

export type Item = { name: string | null; text: string; html: string };
export type Release = {
	version: string; date: string; title: string | null; iris: string | null; summary: string | null;
	added: Item[]; changed: Item[]; fixed: Item[];
};
export type HubItem = {
	id: string; kind: string; name: string; version: string; summary?: string; description?: string;
	authors?: string[]; preview?: string; permissions?: string[]; updated?: string; minInir?: string;
};
export type Hub = { generated: string; commit?: string; permissions: Record<string, string>; items: HubItem[] };

export const version: string | null = release.version;
export const releases = release.releases as Release[];

const catalogue = join(process.cwd(), 'public', 'hub', 'index.json');
export const hub: Hub | null = existsSync(catalogue) ? JSON.parse(readFileSync(catalogue, 'utf8')) : null;

// "2026-10-08" reads as "Oct 8, 2026", the same everywhere.
export const day = (date: string) =>
	new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
