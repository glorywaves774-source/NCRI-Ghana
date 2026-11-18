# Changelog

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
