// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import sidebar from './src/sidebar.generated.json' with { type: 'json' };

// SITE and SITE_BASE come from the deploy: GitHub Pages serves the project under /inir-site/ until a
// custom domain takes over, then the base is /.
const site = process.env.SITE ?? 'https://snowarch.github.io';
const base = process.env.SITE_BASE ?? '/';

export default defineConfig({
	site,
	base,
	integrations: [
		starlight({
			title: 'iNiR',
			description: 'A complete desktop shell for Niri, built on Quickshell.',
			logo: { src: './src/assets/inir-mark.svg' },
			head: [{ tag: 'script', content: "try { const l = localStorage.getItem('inir-look'); if (l) document.documentElement.dataset.look = l } catch {}" }],
			favicon: '/favicon.svg',
			social: [
				{ icon: 'github', label: 'GitHub', href: 'https://github.com/snowarch/iNiR' },
				{ icon: 'discord', label: 'Discord', href: 'https://discord.gg/pAPTfAhZUJ' },
			],
			customCss: ['@fontsource/inter/400.css', '@fontsource/inter/500.css', '@fontsource/inter/600.css',
				'@fontsource/rubik/500.css', './src/styles/looks.css', './src/styles/theme.css'],
			sidebar,
			lastUpdated: false,
			pagination: true,
		}),
	],
});
