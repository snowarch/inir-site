# iNiR site

The website and documentation for [iNiR](https://github.com/snowarch/iNiR), a desktop shell for Niri.

Built with [Astro](https://astro.build) and [Starlight](https://starlight.astro.build). Published at
https://inir.space.

## Where things live

- **The landing page** is `src/pages/index.astro`, styled in `src/styles/home.css` on the shared palette in
  `src/styles/tokens.css`: black and white with one lime accent, Archivo (its width and weight axes do the motion),
  JetBrains Mono for the install commands. The mark is `src/assets/inir-mark.svg`. Every picture is a
  real screenshot of the shell in `public/shots/` (each with a 960 wide copy); distro logos are in `public/distros/`.
- **What's new** comes from iNiR itself: `npm run sync` reads `VERSION` and the newest section of `CHANGELOG.md`
  beside `docs/` and writes `src/release.generated.json`, so a release shows up on the next build.
- **The docs are not in this repository.** They live in [`docs/`](https://github.com/snowarch/iNiR/tree/main/docs)
  in iNiR and change with the shell. `npm run sync` copies them in, turns wiki links into site links and builds
  the sidebar from `docs/_Sidebar.md`. To fix a doc, edit it in iNiR; every page has an Edit link that goes there.
- **The theme for the docs** is `src/styles/theme.css` on the same tokens,.

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
