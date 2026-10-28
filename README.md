# iNiR site

The website and documentation for [iNiR](https://github.com/snowarch/iNiR), a desktop shell for Niri.

Built with [Astro](https://astro.build) and [Starlight](https://starlight.astro.build). Published at
https://inir.space.

## Where things live

- **The pages** are `src/pages/`: the landing page, `/changelog` and `/hub`, all in `src/layouts/Site.astro` and
  `src/styles/site.css` on the shared palette in `src/styles/tokens.css`: near black, hairlines and one amber
  accent, Geist for text and Geist Mono for labels and commands. The mark is `src/assets/inir-mark.svg`. Every
  picture is a real screenshot of the shell in `public/shots/` (each with a 960 wide copy); distro logos are in
  `public/distros/`.
- **Versions and release notes** come from iNiR itself: `npm run sync` reads `VERSION` and every section of
  `CHANGELOG.md` beside `docs/` (a section's bold line names the iRiS version) and writes
  `src/release.generated.json`. The landing page, What's new and `/changelog` follow it, so a release shows up on
  the next build.
- **The hub page** reads the catalogue `inir hub build` writes. Point `INIR_HUB` at its output folder and
  `npm run sync` serves it under `/hub` (`index.json`, packages, previews), the same URLs `inir hub` reads.
- **The docs are not in this repository.** They live in [`docs/`](https://github.com/snowarch/iNiR/tree/main/docs)
  in iNiR and change with the shell. `npm run sync` copies them in, turns wiki links into site links and builds
  the sidebar from `docs/_Sidebar.md`. To fix a doc, edit it in iNiR; every page has an Edit link that goes there.
- **The theme for the docs** is `src/styles/theme.css` on the same tokens, with three Starlight overrides in
  `src/components/docs/`: the site's links in the header, and one column with the page's sections under its title.

## Run it

You need Node 22 or newer and an iNiR checkout.

```bash
git clone https://github.com/snowarch/iNiR.git ../inir
npm install
npm run dev
```

`npm run dev` reads `../inir/docs` by default. Point it elsewhere with `INIR_DOCS=/path/to/inir/docs`.
`npm run build` writes the site to `dist/`.

## Deploying

GitHub Pages serves the `gh-pages` branch. Pushing to `main` builds the site and publishes it there; it also
rebuilds every day, and when iNiR sends a `docs-updated` dispatch, so doc changes show up without touching this
repository. Pull requests build as a check.

`npm run deploy` does the same from your machine.

## License

GPL-3.0, like iNiR.
