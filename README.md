# yoshimaster.com - portfolio

Source of my portfolio site: a self-hosted homelab my household uses every day, a 3D printer rebuilt from the firmware up, and a
troubleshooting log of the failures I have worked through. English and Spanish on every page.

**Live:** https://yoshimaster.com

## How it is built

A small [Jekyll](https://jekyllrb.com/) site, built and served by GitHub Pages. Content and
presentation are separated so that updating a case study never means touching HTML:

| Path | What lives there |
|---|---|
| `_data/pages/*.yml` | All page text, in `en` and `es`, as structured blocks (paragraphs, cases, figures) |
| `_data/charts/*.yml` | Data behind the bar charts |
| `_data/layer_log.yml` | Anonymized incident log (symptom layer, cause layer, status). The troubleshooting matrix and headline numbers are computed from it |
| `_data/incidents.yml` | Troubleshooting field-log cards |
| `_layouts/`, `_includes/` | Liquid templates that turn the data into pages |
| `_includes/svg/` | Hand-written SVG diagrams, one per language |
| `assets/css/site.css` | Design tokens and styles (light and dark) |
| `assets/js/site.js` | Language switch, charts, matrix and filters - no frameworks, no build step |
| `assets/cv/` | Public resume, EN and ES. No phone number: the full version never enters this repo |
| `tools/check-public.sh` | Pre-commit scan that blocks private addresses, serials, phone numbers and credentials, including text inside PDFs |

## Run it locally

```bash
bundle install
bundle exec jekyll serve --livereload
```

Then open http://localhost:4000.

## Privacy

Everything here is sanitized on purpose: no addresses, hostnames, serial numbers or credentials.
Operational documentation with those details lives in a separate private repository.

## License

Code (templates, CSS, JS, scripts): MIT. Written content and diagrams: © Joshua García Nieves, all rights reserved.
