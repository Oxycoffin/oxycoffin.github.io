# AGENTS

## Repo overview
- Static site for GitHub Pages.
- Root pages: `index.html`, `privacy.html`.
- Shared assets in `assets/` (notably `assets/css/styles.css`).
- Domain and ad/verification files: `CNAME`, `app-ads.txt`, `google*.html` (keep content exact).
- `tindrop/` contains the Tindrop legal pages (standalone HTML with inline CSS) plus its own `app-ads.txt`.

## Working guidelines
- No build step; edit HTML/CSS/asset files directly.
- Keep relative links and asset paths stable to avoid broken pages.
- Preserve verification files (`google*.html`) and `app-ads.txt` contents unless explicitly asked.
- Keep all user-facing website additions available in both English and Spanish, including navigation, calls to action, metadata, accessibility labels, and legal/privacy copy.
- Keep the privacy policy content available in both English and Spanish.
- Prefer small, readable HTML/CSS changes; avoid adding frameworks or heavy tooling.
- For Tindrop pages, keep them self-contained (inline CSS) unless refactor is requested.

## Local preview
- Open the HTML file directly in a browser, or
- Run a simple server from repo root:
  - `python -m http.server 8080`
  - Visit `http://localhost:8080/` or the specific page path.

## Commit automation
- After each completed task, create a commit automatically unless the user says otherwise.
- A task is a coherent block of changes; avoid micro-commits.
- Do not commit when the user explicitly requests no commit or when clarifications are required.
- This instruction is explicit authorization to run `git add`/`git commit` without asking.
- If multiple unrelated changes exist, split them into separate commits (use `git add -p` when needed).
- Commit message convention:
  - Subject: `<type>: <verb-infinitive> <scope>` (lowercase), where `<type>` is one of `content`, `style`, `assets`, `seo`, `fix`, `docs`, `chore` and `<scope>` is one of `page`, `styles`, `images`, `meta`, `root`, `tindrop`.
  - Blank line.
  - Body: 1-3 sentences explaining what changed and why.
  - Tests line: `Tests: not run (not requested)` unless the user asked for tests.
  - Closing line: `Next: <one required follow-up before merging>`.
- Never amend commits unless explicitly requested.
- Do not run `git push` from this environment.
