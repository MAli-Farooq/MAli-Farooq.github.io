# ThermVLADAS project page

Static site (HTML, CSS, vanilla JS, no build step) for GitHub Pages.

```
index.html          page
assets/style.css    dark/light theme
assets/app.js       results explorer, charts, pipeline, cases, studio tour
assets/drive.js     interactive driving simulation (illustrative, emulated detector + VLM)
assets/data.js      numbers generated from final-test-results/*.csv
assets/cases.js     VQA case gallery
images/             case and studio screenshots (~4 MB)
```

## Preview locally

```bash
python3 -m http.server 8090 --directory project_page
```

## Publish on GitHub Pages

1. Create a repository (e.g. `ThermVLADAS`) and copy the *contents* of `project_page/` to the repository root, or into a `docs/` folder.
2. Commit and push.
3. On GitHub: Settings → Pages → Source: "Deploy from a branch" → branch `main`, folder `/ (root)` or `/docs` → Save.
4. The site appears at `https://<username>.github.io/<repo>/` after a minute or two.

## Fill in before publishing

- `[Author Names]`, `[Affiliation]` in the hero and the BibTeX block
- `https://github.com/[your-username]/[your-repo]` (the "Code on GitHub" button)
- Paper link (the "Paper (coming soon)" button) and `[Venue]` in the BibTeX
- Check that the dataset licences (LYNRED, C3I, FLIR ADAS) allow redistributing the example frames in `images/`.
