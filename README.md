# CHAoS OS

CHAoS OS is a retro operating-system-style website built with React and Vite.
It combines a draggable desktop, a command-driven Shell terminal, an
Applications Explorer, an Arcade mode, hotline reactions, and layered
easter eggs inside one shared shell.

## Run

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and set the Supabase browser variables.
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and
`VITE_SUPABASE_ADMIN_USER_ID` are required for the hosted Control Desk.

The Shell terminal phrase opens the hidden Control Desk. Editing still requires
a signed-in Supabase Auth session whose user ID matches
`VITE_SUPABASE_ADMIN_USER_ID`; Row Level Security remains the server-side
permission check.

## Build

```bash
npm run build
```

## Deploy

The recommended free setup is Cloudflare Pages for the Vite frontend and the
existing Supabase project for Auth, Postgres, and Storage. No VPS or separate
backend server is required.

Connect the GitHub repository in Cloudflare under **Workers & Pages** and use:

- Framework preset: `Vite`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `/`

Add these variables to the Cloudflare Pages production build environment:

- `VITE_SUPABASE_URL`: Supabase Project URL, ending in `.supabase.co` (do not
  use the `/rest/v1/` endpoint)
- `VITE_SUPABASE_ANON_KEY`: the anon or publishable key
- `VITE_SUPABASE_ADMIN_USER_ID`: the authorized Supabase Auth user UUID
- `VITE_CHAOS_ADMIN_UNLOCK_PHRASE`: the Shell phrase that opens the Control Desk
- `VITE_SUPABASE_CONTENT_TABLE`: `website_content`
- `VITE_SUPABASE_CONTENT_ID`: `main`
- `VITE_SUPABASE_ASSET_BUCKET`: `website-assets`

The `VITE_` values are included in browser code. The anon/publishable key is
appropriate only with the existing Row Level Security policies in place; never
add a database password or service-role key. The Shell phrase is only a hidden
entry point. Supabase Auth and RLS authorize edits. `CHAOS_ADMIN_PASSPHRASE` is
for the local Vite development fallback and must not be set on Cloudflare.

After the first deployment, copy its `*.pages.dev` address into Supabase Auth
URL Configuration as the Site URL and add it to the allowed redirect URLs. Add
the same entries for a custom domain later. Cloudflare provides the `pages.dev`
address free; registering a custom domain is a separate purchase.

The Supabase content row may remain empty. The website keeps its local fallback
until you edit content and explicitly choose **Save All** in the Control Desk.

## Structure

- `src/core/` app shell, boot flow, desktop, windows, and mode routing
- `src/windows/` desktop window surfaces and their data sources
- `src/modes/arcade/` fullscreen arcade mode
- `src/styles/` shared and surface-specific styling
- `public/` static assets such as the CV and applications explorer icons

## Notes

- Website content starts in `src/data/websiteContent.json` and loads from
  `website_content.main` in Supabase when remote content is available.
- An empty `website_content.main` row stays empty. Content is published only
  after you make an edit and choose **Save All**.
- Dashboard edits and uploads require Supabase Auth. Uploaded files go to the
  `website-assets` bucket and their public URLs are stored in website content.
- Set the same `VITE_` values in the host's build environment, then redeploy.
  Static hosts bake these values into the build; changing them requires a new build.
- Never use the database password or a Supabase service-role key in this frontend.
- The Control Desk does not prefill an admin email, persists no Supabase session
  in browser storage, and signs out when it is closed.
- Applications Explorer uses one shared folder icon at `public/icons/applications/folder.png`.
- Optional custom images/icons can use public paths or URLs uploaded through
  the Control Desk.
- The desktop and terminal systems include protected easter eggs and hotline
  behaviors that should be preserved during future changes.
