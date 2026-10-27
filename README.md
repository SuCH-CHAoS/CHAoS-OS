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
- Cloudflare Pages Functions and D1 for hosted content editing
- Cloudflare R2 for Control Desk uploads
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

Create a `.env.local` file from `.env.example` to enable the local Control Desk fallback. Keep `.env.local` private and out of Git.

Useful commands:

```bash
npm run dev       # Start the local development server
npm run lint      # Check the source with ESLint
npm run build     # Create the production build in dist/
npm run preview   # Preview the production build locally
```

## Content Editing

The site starts with fallback content in `src/data/websiteContent.json`. When Cloudflare D1 contains a valid `website_content` record with ID `main`, the public site loads that record instead. An empty D1 database is valid: the fallback is never automatically published. Make a direct Control Desk edit and press **Save All** when you are ready to create the first live record.

The terminal phrase is a concealed entry point only. Control Desk writes require a server-side email/password check and a short-lived signed `HttpOnly`, `Secure`, `SameSite=Strict` cookie. The browser never receives the administrator password or session-signing secret. Closing the dashboard clears the session.

Media uploaded through Control Desk is stored in Cloudflare R2 and served from `/content-assets/`. The bundled public files under `public/website-assets/` are the preserved fallback media and do not require R2.

Use **Download Backup** in the Control Desk whenever you want a copy of the current content. It downloads a complete JSON snapshot of the current draft, including unsaved field edits. Keep downloaded backups in a safe location; the website does not run a background local-sync task or automatically modify the fallback file.

## Cloudflare Setup

Create these resources in the same Cloudflare account as the Pages project:

1. Create a D1 database, then run [`migrations/0001_create_website_content.sql`](migrations/0001_create_website_content.sql) in its SQL console. Do not add a content row manually unless you intentionally want to publish content.
2. Create an R2 bucket for future Control Desk uploads.
3. In **Workers & Pages > CHAoS OS > Settings > Bindings**, add the D1 database as `CHAOS_CONTENT_DB` and the R2 bucket as `CHAOS_ASSETS` for Production. If you later use preview deployments, create separate preview resources instead of connecting previews to live content or uploads.
4. In **Settings > Variables and Secrets**, add encrypted secrets named `CHAOS_ADMIN_EMAIL`, `CHAOS_ADMIN_PASSWORD`, and `CHAOS_ADMIN_SESSION_SECRET`. Use a new, strong password. Generate the session secret with `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` and do not reuse it as a password.
5. Add `VITE_CHAOS_ADMIN_UNLOCK_PHRASE` as a build variable. This phrase is intentionally browser-visible and only opens the hidden Control Desk entry; it is not the authorization boundary.
6. In **Settings > Runtime**, set Functions to fail closed. The site's normal static files remain available because only API and upload paths invoke Functions.

Never put the three `CHAOS_ADMIN_*` secrets in `.env.local`, a `VITE_` variable, GitHub, or any client-side code. Redeploy after adding bindings or secrets. Regular Control Desk content edits then update D1 immediately without a GitHub push or frontend redeploy.

## Deploy

The public frontend and backend both run on Cloudflare Pages; a VPS is not required.

For a GitHub-connected Cloudflare Pages project, use:

- Framework preset: `Vite`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: repository root (leave the field blank)

Add only the unlock phrase build variable above. Bindings and secrets are runtime configuration. Since Vite embeds `VITE_` variables during the build, deploy a new build after changing the unlock phrase. Ordinary content edits saved to D1 do not require a redeploy.

## Project Layout

```text
src/
  core/       App shell, desktop, boot flow, window management, and routing
  data/       Fallback website content
  modes/      Full-screen experiences, including Arcade
  services/   Content API access and admin helpers
  styles/     Shared and component-specific styles
  windows/    Desktop windows, Applications Explorer, Shell, and Control Desk
public/       Static images, icons, CV, and other public assets
functions/    Cloudflare Pages API, authentication, and asset handlers
cloudflare/   Shared server-side authentication helpers
migrations/   D1 schema files
```

## Ownership and Third-Party Software

Original source code, writing, and project assets created for CHAoS OS are © 2026 Mohamed Ashraf and are not offered under an open-source license. See [LICENSE](LICENSE) for the terms. This notice does not change the licenses or ownership of third-party software, libraries, fonts, or assets included or referenced by the project; those remain with their respective authors.

## Contact

Use the links in the website’s **My Socials** window to reach me.
