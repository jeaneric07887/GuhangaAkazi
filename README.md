# GuhangaAkazi

GuhangaAkazi helps people find business ideas, learn useful skills, and explore ways to build a better future. Visitors can browse public content without an account. Users can create accounts to send private messages and follow administrator replies. Admins can sign in to manage site content and conversations.

## Technology

- **Frontend:** React 19, Vite, and React Router
- **Backend:** Node.js, Express 5, and JWT admin sign-in
- **Database:** PostgreSQL

## Requirements

- Node.js 20.19+ or 22.12+
- PostgreSQL 14 or later

## Run the project on your computer

1. Create a PostgreSQL database and a database user. Copy `backend/.env.example` to `backend/.env` and set `DATABASE_URL`.

   To create a local database, run:

   ```sh
   createdb guhangaakazi
   ```

2. Create a secret key for admin sign-in and add it to `backend/.env`. Do not add `.env` files to Git:

   ```sh
   openssl rand -hex 32
   ```

3. Install the backend packages and set up the database tables:

   ```sh
   cd backend
   npm install
   npm run db:setup
   ```

4. Create or reset an admin account. Set `ADMIN_NAME`, `ADMIN_EMAIL`, and a unique `ADMIN_PASSWORD` in `backend/.env`. Use a strong password with at least 12 characters, then run:

   ```sh
   npm run admin:create
   ```

   Passwords are stored safely with bcrypt. This command creates the account if it is new, or updates the existing matching email's password and name. The app does not create a default admin account or password. Remove `ADMIN_PASSWORD` from your local environment after creating or resetting the account.

5. Configure email notifications. In your Google Account, turn on 2-Step Verification, create an App Password, and set it as `SMTP_PASSWORD` in `backend/.env`. Use `jeaneric07887@gmail.com` for `SMTP_USER` and `CONTACT_EMAIL`. Do not use your normal Gmail password.

6. Configure automatic WhatsApp notifications with Meta's WhatsApp Cloud API. Set up a Meta business app and WhatsApp Business phone number, then add its access token and phone number ID to `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID`. Set `WHATSAPP_RECIPIENT=250798740065` for the site owner's number. Create and get approval for a utility message template named `website_contact_notification` in the selected language. The template body must have exactly three text placeholders in this order: sender name (`{{1}}`), sender WhatsApp number (`{{2}}`), and message preview (`{{3}}`). Set `WHATSAPP_TEMPLATE_LANGUAGE` and a currently supported `WHATSAPP_API_VERSION`. Never commit the Meta access token.

7. Start the API in one terminal:

   ```sh
   cd backend
   npm run dev
   ```

8. Start the React website in another terminal:

   ```sh
   cd frontend
   npm install
   npm run dev
   ```

   Vite sends `/api` and uploaded-photo requests to `http://localhost:4000`. The API defaults to port `4000`; set `PORT` only when your host requires a different port. Opening the backend root displays an API-running message; check `GET /api/health` for database status. If the API runs on a different server, set `VITE_API_URL` in `frontend/.env` and set `FRONTEND_ORIGIN` on the API to the website address.

Check the API at `GET /api/health`. It also checks the database connection. The admin page is at `/admin`.

## Content and API routes

Public routes:

- `GET /api/ideas`, `/api/skills`, `/api/opportunities`
- `GET /api/{ideas|skills|opportunities}/:id`
- `GET /api/search?q=...` searches partial text across published content details, cost/income text, and photo/video titles and descriptions; the website updates results while the visitor types.
- `GET /api/comments?content_type=ideas&content_id=1`
- `POST /api/comments`
- `POST /api/account/register`, `POST /api/account/login`
- `GET /api/messages` (authenticated; returns only the signed-in user's conversations)
- `POST /api/contact` (authenticated; saves the message and its WhatsApp number)

Admin routes use a bearer JWT from `POST /api/admin/login`. Admins can add, edit, and delete content, comments, media, contact messages, conversations, and conversation messages. Upload common photo formats (JPEG, PNG, GIF, WebP, AVIF, BMP, TIFF, HEIC/HEIF, and ICO) or video formats (MP4, WebM, MOV, AVI, MKV, WMV, MPEG, 3GP, Ogg, FLV, M4V, and TS) up to 10 MB and 50 MB respectively, then save them to the selected item. Playback depends on the visitor's browser support. Cost and income fields accept free-form text (including ranges) and display exactly as entered, with no currency automatically added. Uploaded files are stored in `backend/uploads/`; production deployments must use durable persistent or object storage so uploads survive restarts and deployments. Admins can also reply to conversations at `POST /api/admin/conversations/:id/replies`.

User accounts are created at `/account`. Signed-in users can submit a Contact Us message with their WhatsApp number and privately see conversations and administrator replies at `/messages`. Users can continue a conversation from the Messages page; a follow-up returns its status to **Pending** and queues fresh email and WhatsApp alerts for the administrator. The Admin Dashboard's **Messages** tab shows sender details, WhatsApp number, message history, reply history, and email/WhatsApp delivery status. Administrator replies are saved to the conversation and appear in the user's inbox.

New conversations and email/WhatsApp notification jobs are committed together in PostgreSQL. The backend worker sends alerts to `jeaneric07887@gmail.com` via SMTP and `+250798740065` through Meta's WhatsApp Cloud API. WhatsApp uses the approved template and credentials described above; a phone number alone cannot send automatic WhatsApp messages. Failed notification jobs are retried with increasing delays, up to eight attempts. Delivery status is visible in the Admin Dashboard; configure both providers and verify their status before launch. A provider may reject or delay a notification, but the user's message remains stored in PostgreSQL.

Admin routes use an audience-restricted bearer JWT from `POST /api/admin/login`; user tokens cannot access admin APIs, and admin tokens cannot read user inboxes. New public comments must be approved before they appear on the site.

Database tables and sample content are in `database/schema.sql` and `database/seed.sql`. Run `npm run db:setup` from `backend/` to set them up. You can run this command again safely: it does not delete existing data.

## Check the project locally

```sh
npm --prefix frontend ci
npm --prefix backend ci
npm --prefix frontend run lint
npm --prefix frontend run build
npm --prefix backend test
```

To check the API against the configured PostgreSQL database, start it and request `GET /api/health`. The automated backend tests stub database queries; they do not replace a production-database smoke test.

## Production build and hosting

The frontend and backend are deployed separately. Create production environment variables in the hosting providers; never upload local `.env` files. At minimum:

- Backend: `PORT` (provided by the host; local default is `4000`), `DATABASE_URL`, `DATABASE_SSL=true`, `JWT_SECRET` (at least 32 characters), and `FRONTEND_ORIGIN` (the exact HTTPS frontend origin). For Vercel uploads, connect a Vercel Blob store to the backend project so `BLOB_READ_WRITE_TOKEN` is available. Local uploads use `backend/uploads/`.
- Frontend build: `VITE_API_URL=/api` and `VITE_SITE_URL` (the HTTPS frontend origin without a path). The Vercel frontend proxies `/api` and `/uploads` to the backend; on other hosting, set `VITE_API_URL` to the HTTPS backend base URL ending in `/api` and allow the exact frontend origin in the backend's `FRONTEND_ORIGIN`.
- Configure SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `CONTACT_EMAIL`) and Meta WhatsApp Cloud API settings (`WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_RECIPIENT`, approved template name/language, and supported API version) to enable both notification channels.

Build the frontend with the production values available to the build process:

```sh
cd frontend
VITE_API_URL=https://api.your-domain.example/api \
VITE_SITE_URL=https://www.your-domain.example \
npm run build
```

`VITE_SITE_URL` generates `dist/sitemap.xml` and adds its URL to `dist/robots.txt`; without it, the build warns and deliberately does not emit a sitemap with a fake domain. Admin pages are excluded from the sitemap and marked `noindex`. The frontend's `/api` default and Vite proxy are for same-origin/local development; use the production API URL when frontend and backend are on separate hosts.

Publish the contents of `frontend/dist` and configure the static host to serve `index.html` as the fallback for application routes such as `/ideas` and `/privacy`. Keep the generated `robots.txt` and `sitemap.xml` at the site root.

Before starting the backend, create the production PostgreSQL database, then run the schema and sample seed setup from a trusted environment:

```sh
cd backend
npm run db:setup
npm start
```

Set `ADMIN_NAME`, `ADMIN_EMAIL`, and a unique strong `ADMIN_PASSWORD` for the one-time `npm run admin:create` command. Do not use seeded or default administrator credentials. Check `GET /api/health` after startup; it verifies the database connection.

### Hosting readiness

Verified in this repository: separate frontend/backend folders, ignored environment files and `node_modules`, example environment files, PostgreSQL schema and repeatable sample seeds, API port configuration, restricted CORS, validation/rate limits, hashed admin/user passwords, audience-separated JWT-protected APIs, private user inbox queries, atomic conversation/reply storage, notification outbox retries, responsive CSS breakpoints, public loading/error/empty states, an application 404 route, SEO metadata, `robots.txt`, and tests/build scripts.

Still required for a real launch: choose and configure the hosting providers and production domain; set the production environment variables above; finish Meta business/phone setup and get the WhatsApp template approved; supply and verify SMTP and Meta credentials; enable HTTPS; run the database setup and create the production admin; make and securely retain a production database backup; verify real email and WhatsApp delivery; verify actual hosting/database connectivity and all routes/forms/admin operations; inspect the deployed site on real mobile/tablet/desktop viewports; and submit the live sitemap to Google Search Console after verifying the domain. These depend on provider accounts, credentials, domain, and production data and cannot be completed from the source tree.

The database setup script migrates the three cost and income fields to text while preserving existing values. Photos and videos can be uploaded or managed as external HTTP(S) links. Vercel uploads transfer directly from the browser to Blob storage, avoiding serverless request-size and temporary-filesystem limits. Other hosting providers need durable object storage or persistent local storage. The seed script adds sample public content; review and replace it with launch content as needed. The project has no database migration framework, so back up production before applying future schema changes.

To create a database backup, run `pg_dump` against the production database from a trusted environment and store the output outside this repository. Never put database dumps, credentials, or private production data in Git.

### GitHub publication

Check `git status`, the intended branch, and `git remote` before publishing. Confirm `.env` and `node_modules` are ignored and review staged files for secrets. Push the reviewed changes to the intended GitHub repository and branch before connecting hosting to it. Do not commit secrets, backups, or generated `dist/` files.

The backend `npm run dev` command uses Node.js watch mode and restarts the API when you change a file.
