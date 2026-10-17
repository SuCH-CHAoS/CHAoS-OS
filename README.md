# CHAoS OS

CHAoS OS is my personal website, built as a small interactive desktop environment instead of a conventional set of web pages. It takes cues from late-90s operating systems and command-line tools, then gives them a look and personality of their own.

Open it at **[chaos-os.pages.dev](https://chaos-os.pages.dev/)**.

## What You Can Explore

- **Desktop:** A responsive desktop with movable windows, a taskbar, system tray, phone interactions, and hidden details to discover.
- **Applications:** A folder-based explorer for browsing software projects and opening their details.
- **Arcade:** A separate game-development and interactive experience area.
- **Shell:** A command-driven terminal with cybersecurity and networking projects, command responses, and terminal-style project windows.
- **About Me and My Socials:** Background information, a CV download, and links to find me elsewhere.
- **Control Desk:** A private content editor for managing supported website sections, project details, and uploaded media.

The desktop, window behavior, and retro visual language are part of the experience. The layout adapts for touch screens and smaller devices while keeping the phone and its message bubble available.

## Easter Eggs

There are a few secrets tucked around the desktop for curious visitors:

- Click the **CHAoS OS** taskbar label three times to trigger a short reveal.
- Try the small blank area just above the taskbar label a few times. There is something hiding there.
- Enter the classic Konami Code on the desktop for an arcade-themed response.
- Visit the desktop late at night for a different message.
- Tap the phone or the security icon in the system tray more than once; they have responses of their own.
- In **Shell**, type `EGGS` to see the public hidden-command hints. Commands include `WAKEUP`, `SAMURAI`, `PANTHEON`, `GHOST`, `RUNNER`, `GLITCH`, and `KONAMI`.

Some of these are easier to find than others. The private administrator entry details are intentionally not documented here.

## Technology

- React 19
- Vite 7
- JavaScript and CSS
- Supabase Auth, Postgres, and Storage for hosted content editing
- Cloudflare Pages for the public frontend

## Run Locally

You’ll need a recent Node.js LTS release and npm.

```bash
git clone https://github.com/SuCH-CHAoS/CHAoS-OS.git
cd CHAoS-OS
npm install
```

For frontend-only work, the site can run with its bundled fallback content:

```bash
npm run dev
```

Create a `.env.local` file from `.env.example` to connect a local build to Supabase. Keep `.env.local` private and out of Git.

Useful commands:

```bash
npm run dev       # Start the local development server
npm run lint      # Check the source with ESLint
npm run build     # Create the production build in dist/
npm run preview   # Preview the production build locally
```

## Content Editing

The site starts with fallback content in `src/data/websiteContent.json`. When a valid `website_content` record with ID `main` is available, the public site loads that content from Supabase. The Control Desk requires a signed-in Supabase Auth session for the configured administrator, and database Row Level Security policies must authorize that user.

The hosted Supabase content record may remain empty. Until it is initialized, the website uses its bundled fallback content. The first direct Control Desk edit followed by **Save All** creates or updates the `main` record; no fallback content is published automatically. After the access policies are set up, saved edits are available to site visitors without a GitHub push or frontend redeploy. Visitors may need to reload an already-open page to fetch the latest content.

Media uploaded through the Control Desk is stored in the configured Supabase Storage bucket. Public URLs for uploaded assets are referenced by the saved website content.

Use **Download Backup** in the Control Desk whenever you want a copy of the current content. It downloads a complete JSON snapshot of the current draft, including unsaved field edits. Keep downloaded backups in a safe location; the website does not run a background local-sync task or automatically modify the fallback file.

### Transfer and Restore Content

Run [`scripts/restore-website-backup.cmd`](scripts/restore-website-backup.cmd) to open the CHAoS OS content transfer console. It asks for the project directory, checks that GitHub `main` is current, validates every content source, and lets you explicitly choose one direction:

- **Live -> Local + GitHub:** Downloads the live Supabase record into `src/data/websiteContent.json`, commits that fallback, and pushes `main`.
- **Local -> Live + GitHub:** Publishes the current local fallback to Supabase, then commits and pushes that same content file if it changed.
- **Backup -> Live + Local + GitHub:** Restores a downloaded Control Desk JSON backup to Supabase and the local fallback, then commits and pushes it.
- **Compare Live and Local:** Shows whether the two content records match without changing anything.

Live writes require the Supabase **Auth** administrator email and password. They are used only in memory to obtain a short-lived session, and the tool verifies the authenticated user ID against `VITE_SUPABASE_ADMIN_USER_ID` before RLS can accept the update. Your database password, service-role key, and credentials are never saved in the project or a backup.

The tool never chooses a conflict direction on its own. It stops if GitHub `main` is ahead or behind, or if a transfer would overwrite uncommitted local content. Every successful fallback change is committed as `Sync website content` and pushed to GitHub; Cloudflare Pages then deploys the fallback automatically.

## Supabase Configuration

Set these variables in `.env.local` for local use and in the hosting provider’s build settings for production:

| Variable | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL, such as `https://your-project.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Browser-safe anon/publishable key, used only with correct RLS policies |
| `VITE_SUPABASE_ADMIN_USER_ID` | UUID of the one Supabase Auth user permitted by the application |
| `VITE_CHAOS_ADMIN_UNLOCK_PHRASE` | Phrase that opens the hidden Control Desk entry point |
| `VITE_SUPABASE_CONTENT_TABLE` | Content table name; defaults to `website_content` |
| `VITE_SUPABASE_CONTENT_ID` | Content record ID; defaults to `main` |
| `VITE_SUPABASE_ASSET_BUCKET` | Storage bucket name; defaults to `website-assets` |

The terminal phrase is only a concealed entry point, not authentication. Supabase Auth and database/storage policies are the actual authorization boundary. Values prefixed with `VITE_` are included in browser code. Never put a database password, Supabase secret key, or service-role key in a `VITE_` variable or in this repository. `CHAOS_ADMIN_PASSPHRASE` is only for the local development fallback and must not be configured on the public host.

Configure the Supabase Auth Site URL and allowed redirect URLs to include the deployed site address. Review the project’s RLS and Storage policies before enabling live editing.

Run [`supabase/website-access-policies.sql`](supabase/website-access-policies.sql) once in the Supabase SQL Editor before using the hosted Control Desk. It creates the needed public read and administrator-only write policies for `website_content.main` and the `website-assets` upload bucket. Do not loosen those policies or add a service-role key to the frontend.

## Deploy

The public frontend is hosted on Cloudflare Pages and the backend services are provided by Supabase; a VPS is not required.

For a GitHub-connected Cloudflare Pages project, use:

- Framework preset: `Vite`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: repository root (leave the field blank)

Add the Supabase variables above to the Cloudflare Pages build environment. Since Vite embeds `VITE_` variables during the build, deploy a new build after changing those settings. Ordinary content edits saved to Supabase do not require a redeploy.

## Project Layout

```text
src/
  core/       App shell, desktop, boot flow, window management, and routing
  data/       Fallback website content
  modes/      Full-screen experiences, including Arcade
  services/   Supabase client, content access, and admin helpers
  styles/     Shared and component-specific styles
  windows/    Desktop windows, Applications Explorer, Shell, and Control Desk
public/       Static images, icons, CV, and other public assets
```

## Ownership and Third-Party Software

Original source code, writing, and project assets created for CHAoS OS are © 2026 Mohamed Ashraf and are not offered under an open-source license. See [LICENSE](LICENSE) for the terms. This notice does not change the licenses or ownership of third-party software, libraries, fonts, or assets included or referenced by the project; those remain with their respective authors.

## Contact

Use the links in the website’s **My Socials** window to reach me.
