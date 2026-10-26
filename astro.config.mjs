// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import sidebar from './src/sidebar.generated.json' with { type: 'json' };

// SITE and SITE_BASE come from the deploy; inir.space serves the site at the root.
const site = process.env.SITE ?? 'https://inir.space';
const base = process.env.SITE_BASE ?? '/';

export default defineConfig({
	site,
	base,
	integrations: [
		starlight({
			title: 'iNiR',
			description: 'A complete desktop shell for Niri, built on Quickshell.',
			favicon: '/favicon.svg',
			social: [
				{ icon: 'github', label: 'GitHub', href: 'https://github.com/snowarch/iNiR' },
				{ icon: 'discord', label: 'Discord', href: 'https://discord.gg/pAPTfAhZUJ' },
			],
			customCss: ['@fontsource/inter/400.css', '@fontsource/inter/500.css', '@fontsource/inter/600.css',
				'@fontsource/instrument-serif/latin-400.css', '@fontsource/jetbrains-mono/400.css',
				'./src/styles/tokens.css', './src/styles/theme.css'],
			components: { PageTitle: './src/components/PageTitle.astro' },
			// Vitesse keeps code in muted greens and oranges; blocks take the page's colours and no fake window chrome.
			expressiveCode: {
				themes: ['vitesse-dark', 'vitesse-light'],
				useStarlightUiThemeColors: true,
				defaultProps: { frame: 'code' },
				styleOverrides: { borderRadius: '10px', codeFontFamily: 'var(--mono)', uiFontFamily: 'var(--mono)', frames: { frameBoxShadowCssValue: 'none' } },
			},
			sidebar,
			lastUpdated: false,
			pagination: true,
		}),
	],
});
