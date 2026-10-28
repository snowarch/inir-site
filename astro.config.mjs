// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import sidebar from './src/sidebar.generated.json' with { type: 'json' };
import { renameSync, rmSync } from 'node:fs';

// Kira's terms and privacy keep their addresses (/kira-bot/terms.html): the Discord developer portal links them, and
// Astro would write them as folders.
const kiraPages = {
	name: 'kira-pages',
	hooks: {
		'astro:build:done': ({ dir }) => {
			for (const name of ['terms', 'privacy']) {
				const folder = new URL(`kira-bot/${name}.html/`, dir);
				const page = new URL(`kira-bot/${name}.page`, dir);
				renameSync(new URL('index.html', folder), page);
				rmSync(folder, { recursive: true });
				renameSync(page, new URL(`kira-bot/${name}.html`, dir));
			}
		},
	},
};

// SITE and SITE_BASE come from the deploy; inir.space serves the site at the root.
const site = process.env.SITE ?? 'https://inir.space';
const base = process.env.SITE_BASE ?? '/';

export default defineConfig({
	site,
	base,
	integrations: [
		kiraPages,
		starlight({
			title: 'iNiR',
			description: 'A complete desktop shell for Niri, built on Quickshell.',
			favicon: '/favicon.svg',
			logo: { src: './src/assets/inir-mark.svg' },
			social: [
				{ icon: 'github', label: 'GitHub', href: 'https://github.com/snowarch/iNiR' },
				{ icon: 'discord', label: 'Discord', href: 'https://discord.gg/pAPTfAhZUJ' },
			],
			customCss: ['@fontsource-variable/geist', '@fontsource-variable/geist-mono', './src/styles/tokens.css', './src/styles/theme.css'],
			// One column with the sections under the title, the site's links in the header, always dark.
			components: {
				Header: './src/components/docs/Header.astro',
				PageTitle: './src/components/docs/PageTitle.astro',
				TwoColumnContent: './src/components/docs/TwoColumnContent.astro',
				ThemeProvider: './src/components/docs/ThemeProvider.astro',
				ThemeSelect: './src/components/docs/ThemeSelect.astro',
			},
			// Vitesse keeps code in muted greens and oranges; blocks take the page's colours and no fake window chrome.
			expressiveCode: {
				// The site is dark only; the light theme stays because Starlight's UI colours want a pair.
				themes: ['vitesse-dark', 'vitesse-light'],
				useStarlightUiThemeColors: true,
				defaultProps: { frame: 'code' },
				styleOverrides: { borderRadius: '0', borderColor: 'var(--sl-color-hairline-light)', codeFontFamily: 'var(--mono)', uiFontFamily: 'var(--mono)', frames: { frameBoxShadowCssValue: 'none' } },
			},
			sidebar,
			lastUpdated: false,
			// The site's own 404 (src/pages/404.astro) wears the landing page's frame.
			disable404Route: true,
			pagination: true,
		}),
	],
});
