# NCRI-Ghana website

One folder, no npm packages. Needs **Node 22.5 or newer**.

## Run it
    node server.js
Open http://localhost:3000 (site) and http://localhost:3000/admin/ (admin).

On the very first start the server creates the administrator and prints the email and password once in the terminal.
To choose them yourself, set ADMIN_EMAIL and ADMIN_PASSWORD before the first start (see .env.example). Change the password under Admin > Account.

## What the admin can do
Dashboard (and the questions Laari could not answer), Messages (contact, volunteer and partner forms), Donations (mark gifts Paid when the money arrives),
News, Documents and policies (upload PDFs/Word/Excel), Laari answers, People, Partners, Videos, Gallery, Results (numbers and indicators), Ways to give,
Site text and live broadcast, Subscribers (CSV download), Account.

## Where things are kept
data/ncri.db (database), data/uploads (pictures and videos, public), data/docs (documents, served only through download links).
Back up the whole data/ folder. On a host with a temporary disk, point DATA_DIR at a persistent disk or everything uploaded is lost on restart.

## Online giving (optional)
Set PAYSTACK_SECRET_KEY and/or STRIPE_SECRET_KEY and the "online" giving option works.
Webhooks: https://YOUR-DOMAIN/api/webhooks/paystack and https://YOUR-DOMAIN/api/webhooks/stripe (Stripe also needs STRIPE_WEBHOOK_SECRET).
Until then, gifts are recorded as references that donors quote when paying by Mobile Money or bank, and you match them under Admin > Donations.
Fill in the real payment accounts under Admin > Ways to give only after NCRI-Ghana has verified them.

## Security notes
Passwords are hashed (scrypt); sign-in cookie is HttpOnly and SameSite=Strict; forms are rate-limited and have a spam trap; uploads are type-checked;
documents are never served directly from disk. Serve it over HTTPS (set BASE_URL to https://...).

## Notes
Programmes, core values and policy-section headings are read from assets/seed/*.json. Edit those files to change them.
The front end still works as a plain static preview (without the server) using the same seed files.


## Language menu (Google Translate)
A globe button in the header lets visitors translate the whole site: French, Twi, Ewe, Ga, Hausa, Arabic, Spanish, Portuguese, German, Chinese and Kiswahili. Translation is done in the visitor's browser by Google Translate, needs no key or account, and is remembered for later visits. It is machine translation, so a note in the menu says wording may be inaccurate. Dagbani, Konkomba and other local languages are not offered by Google Translate; for those, add translated pages or documents yourself. The Content-Security-Policy in `server.js` allows the Google Translate domains; remove them there and delete `assets/js/translate.js` to switch the feature off.

## Results charts
Results > Headline numbers: set the planned range (low and high) and update **Achieved** as results are verified. The Impact page and the home page show the planned-reach chart and a matching verified-results pie, plus a planned-versus-verified comparison. Indicators add a status pie and progress bars once you enter them. Until actuals are entered the verified chart shows an empty ring, not made-up numbers.

## Look and motion (Aurora UI)
Brand colours are unchanged. Headings use Newsreader (serif) with Figtree for text, loaded from Google Fonts. There is no glass: every panel, card, menu and button is a solid surface with soft depth and rounded corners. Colour comes from soft, slowly drifting aurora light (brand greens, teal and orange) behind the page, inside each section, across the green bands, over the hero photo and on the call-to-action banner. The navigation buttons all use the one brand green; Donate stays orange. Motion switches off for visitors who set "reduce motion" on their device. Styles: the "AURORA UI" layer at the end of `assets/css/site.css`, and `assets/css/mobile.css` (loaded last) for phones, tablets and printing.

## Phones, tablets and dark mode
- **Menu:** on phones and tablets the menu button sits top-left and opens a menu that slides in from the left over a dimmed page, with a "Find a page" box. It closes with ×, a tap on the dimmed page, Escape or the phone's Back button. Choosing a page does not leave an extra Back step.
- **Tab bar (phones):** Home, Work, News, Donate and Menu along the bottom. Laari's button sits above it.
- **Laari on phones:** opens as a half-screen window; the keyboard stays down until you tap the box, and while typing the window fills the space above the keyboard.
- **Dark / light:** the moon/sun button is on every page, including the admin sign-in. The site follows the device until a visitor chooses, then remembers the choice. Printouts are always white.
- **Admin on phones:** a bottom tab bar (Home, Messages, Gifts, News, Menu) and the same slide-in menu with a filter box.
- **Checks:** `npm test` runs the automated tests (pages, standard pieces, forms, chat, admin sign-in).

## Call to action update
The homepage CTA now uses **“Be Part of the Change”** and presents four clear routes: Partner With Us, Become a Volunteer, Support Our Work, and Work With Our Communities. The primary actions link to the existing partnerships, volunteer, donate, and contact pages. The Get Involved page introduction has also been updated.

## UN Sustainable Development Goals
The home page (after the impact numbers) and the Programmes page show the 17 SDGs. Seven are marked as focus areas (2, 4, 5, 6, 8, 13, 16) and three as contributing (1, 10, 17), each linked to the programme pillars that deliver it; selecting a goal explains how and opens the pillar story. To change the mapping, edit the `FOCUS` list at the top of `assets/js/sdgs.js`. Goal names are the UN's wording; the tiles are our own design, not UN icons, with a note that this does not imply UN endorsement.

## Page banners
Each inner page shows a photo beside its title. Edit the `HERO_PHOTOS` list in `assets/js/core.js` to change which photo each page uses.

## Search engine optimisation (SEO)
- Every page has a clear title, description, canonical link, Open Graph and Twitter preview tags, and `lang="en"`. The home page also carries NGO structured data (name, logo, Saboba address, areas of work). It makes no claim about registration.
- `/sitemap.xml` and `/robots.txt` are generated by the server from `BASE_URL`, so **set `BASE_URL` to your real address** (for example `https://ncri.edspike.com`). The `{{BASE_URL}}` placeholder in the HTML is filled in the same way.
- `/admin/`, `/api/` and `/download/` are kept out of search results. The 404 page is `noindex`.
- After going live: add the site to Google Search Console and Bing Webmaster Tools and submit `/sitemap.xml`. Keep page titles and picture descriptions (alt text) specific, and publish news regularly.

## Security
- Headers on every response: Content-Security-Policy, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, Cross-Origin-Opener-Policy and (on https) Strict-Transport-Security.
- Admin sign-in is rate limited, passwords are salted and hashed, sessions are HttpOnly, SameSite=Strict cookies, and every change request needs the `X-Requested-With` header (blocks cross-site requests). Uploads are checked by type and size and limited per hour.
- Request timeouts stop slow-connection attacks; documents are served only through `/download/<id>` and unpublished ones need an admin session.
- `/.well-known/security.txt` tells researchers where to report problems (`SECURITY_EMAIL`).
- Good practice: serve over https, use a strong admin password (10+ characters), set `TRUST_PROXY=1` behind a proxy, keep Node updated, and keep `.env` out of version control.

## Backups and recovery
- **Automatic:** the server makes a backup about once a day (and one minute after start if the last is over 20 hours old) and keeps the latest 14 (`BACKUP_KEEP`). A backup is a folder in `data/backups/` with a consistent copy of the database, the uploaded pictures and videos, the documents and a `manifest.json` of checksums. Set `BACKUP_DIR` to another disk, and `BACKUP_DISABLE=1` to turn it off.
- **In the admin panel:** *Backups* shows each backup, lets you make one now, check it is complete, and download the database file. Keep a copy somewhere other than the server (another computer or cloud storage), because a backup on the same disk does not protect you from losing that disk.
- **From the command line** (in the site folder):
  - `node backup.js` make a backup now
  - `node backup.js list`
  - `node backup.js verify <name>` check the checksums and the database
  - `node backup.js restore <name>` **stop the server first.** The current data is kept in `data/pre-restore-<time>/` so nothing is lost, then the backup is put back. Start the server again.
- Test a restore on a spare copy once in a while. A backup you have never restored is only a hope.

## Social media links (Facebook, Instagram, LinkedIn)
Sign in to `/admin/`, open **Site text and live**, then **Contact details**, and paste the full address of each official page into *Social facebook*, *Social instagram* and *Social linkedin* (X, YouTube and WhatsApp are there too). Save. The links then appear as round icons in the footer of every page and as coloured buttons under "Follow us" on the Contact page, and Laari mentions them. A field left empty shows nothing, so no placeholder links are ever published.
