# Changelog

## 18 November 2026 (late): smoother, with Aurora and Spatial UI
- Aurora: a soft, slowly drifting light field (brand greens, teal and orange) now sits behind every page, faint enough not to compete with the photos. Sections flow into one another instead of hard white and green bands.
- Spatial: panels float in layers with natural depth; cards, the menu bar, the hero and the banner have rounder corners and lift smoothly when touched.
- The green feature band is now a floating rounded panel.
- On phones the tab bar floats as a rounded bar above the bottom edge.
- Smooth scrolling between sections. All motion still stops for "reduce motion"; all surfaces stay solid (no glass).

## 18 November 2026 (late): Apple UI
- Interface text uses Apple's system font (San Francisco on iPhone, iPad and Mac; Figtree elsewhere); serif headings stay.
- Every button, link and control is at least 44 pixels tall, as Apple recommends for fingers.
- Segmented controls (iOS style) for the team groups, news and resource filters.
- Inset grouped lists with chevrons for the menu and the common questions.
- On phones, Laari and pop-ups rise from the bottom as sheets with a grab handle over a dimmed page.
- Secondary buttons use Apple's tinted style; the "keep my gift anonymous" box is an iOS switch; fields are soft grey and light up when you type.
- The tab bar marks the current page with colour only, as on iOS. Motion uses Apple's spring timing.
- Admin panel: same font, tinted buttons, switches and fields.

## 18 November 2026 (night): motion
- The photo magnifier bubble is removed from the whole site (it was still on the home page hero).
- Groups of cards, value chips and partner logos flow in one after another as they scroll into view; section headings rise gently into place.
- The woven strip draws itself across the hero on arrival, across the footer when it comes into view, and across the admin menu and sign-in.
- Charts on the home and Impact pages draw their rings in.
- Aurora light drifts slowly in the hero and the "Be Part of the Change" banner.
- Hero text arrives in sequence with each slide.
- Small touches on hover: arrows nudge forward, menu links get an underline, chips and logos lift slightly, buttons press in.
- Admin dashboard cards fade in one after another.
- Reveals are a clean rise (no blur or 3D tilt), so they stay smooth on low-cost phones.
- Every motion switches off for visitors who choose "reduce motion" on their device.

## 18 November 2026 (evening): calm, editorial design
- Calmer, photo-led look: plain light sections that alternate white and a soft green wash, generous spacing, and slightly larger body text.
- Removed busy effects: tilting cards, floating 3D balls, morphing colour blobs, button ripples, magnetic buttons, the photo magnifier bubble, parallax, rainbow section borders and glows, the rainbow heading and glossy highlights.
- Moving strips are now still: core values wrap in a tidy row, partner logos sit in a grid, and community photos can be swiped or scrolled.
- One accent per job: navigation is quiet text with the current page in green; orange is kept for Donate and each section's main action; other buttons are green outlines.
- Aurora light kept only in the hero, the green band and the "Be Part of the Change" banner.
- A woven strip inspired by Northern Ghanaian cloth runs along the foot of the hero and the top of the footer.
- Fixed missing icons: Water, Sanitation & Hygiene, and three policy headings (child safeguarding, gender and inclusion, data protection).
- Fixed: the right-hand column of "Our impact in numbers" no longer floats in the middle of empty space.
- Scripts loaded on the fly also get the version stamp, so updates always show at once.
- Applied across every page and the admin panel: flat document badges on Policies, Resources and Partnerships; a compact live panel on Media when nothing is broadcasting; "ways to help" cards numbered 01, 02, 03 on every page; the admin panel uses the same fonts, rounded buttons, calm cards and woven strip.

## 18 November 2026 (later): card colours and legibility
- Dark mode: cards no longer look black. They sit a clear step above the page, carry a hint of their own colour with a coloured top edge, and use clean shadows instead of fuzzy glows.
- Dark mode: brighter body text, and icon tiles use a deeper shade so white symbols stay clear (for example "Our Vision").
- Form fields and amount buttons are clearly raised from their card in both modes.
- The selected giving option (Local / International / Online) has a clear orange outline and a tick again, and a chosen amount is filled orange. The coloured edge on the SDG detail card is back.
- Numbered badges on the About page are a deeper shade so the numbers are easy to read.

## 18 November 2026: Aurora UI, phone navigation and dark mode

**Look**
- All glass effects removed: no frosted blur, see-through panels, moving light sweeps, mouse-following shine or ripple filter. Panels, menus and buttons are solid.
- New Aurora UI: soft, slowly drifting colour light behind the page, in each section, on the green bands, over the hero photo and on the "Be Part of the Change" banner.
- Hero text now sits on a soft green shade over the photo instead of a frosted box.
- Navigation buttons all use the one brand green (Donate stays orange).

**Phones and tablets**
- Menu button moved to the top-left. The menu slides in from the left over a dimmed page, has a "Find a page" box, and closes with ×, a tap outside, Escape or the Back button.
- New bottom tab bar on phones: Home, Work, News, Donate, Menu.
- Laari opens as a half-screen window on phones, does not pop the keyboard up, and fills the space above the keyboard while you type.
- Fixed: the donation option cards and the people cards ran off the side of the screen on phones.
- Form fields use 16px text so iPhones do not zoom in.

**Dark and light mode**
- The choice is remembered in the browser and a cookie, and the button shows a sun in dark mode.
- Fixed hard-to-read text: two SDG tiles (Clean Water, Gender Equality) and the numbered badges on the About page.
- Printouts are always white.

**Admin panel**
- Dark/light button on the sign-in page and every admin screen.
- New sign-in look (soft raised panel with pressed-in fields).
- On phones: bottom tab bar (Home, Messages, Gifts, News, Menu) and a slide-in menu with a filter box, closed by ×, a tap outside, Escape or Back.
- Dark mode menu and buttons use a deeper green so white text stays readable.

**Other fixes**
- The "Be Part of the Change" cards were all numbered 01; now 01–04.
- Earlier today: the Managing Director's bio no longer resets on every restart; the Paystack payment check uses a safe comparison.

**Tests**
- New automated tests: `npm test`.
