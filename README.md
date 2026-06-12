# אוֹצַר מִילִים וּפִתְגָמִים

מִשְׂחַק טריוויה בִּעֲבָרִית מְנוּקֶּדֶת (Vite + TypeScript).

## GitHub Pages

1. דחוף את הריפו ל־GitHub.
2. ב־**Settings → Pages**:
   - **Source**: בחר **GitHub Actions** (לא Branch).
3. ודא ששם הענף לפריסה הוא `main` או `master` (שניהם מוגדרים ב־workflow). אם הענף אחר — עדכן ב־`.github/workflows/github-pages.yml`.
4. אחרי push מוצלח, ב־**Actions** תראה את הריצה; בסיום האתר יהיה ב־[https://moshehoff.github.io/vocabularygame/](https://moshehoff.github.io/vocabularygame/) (לפי [הריפו vocabularygame](https://github.com/moshehoff/vocabularygame)).

הבנייה משתמשת ב־`base: './'` ב־`vite.config.ts` כדי ש־נתיבי נכסים ו־`questions.json` יעבדו מתחת לתת־נתיב של Pages.

### בדיקה מקומית של build

```bash
npm ci
npm run build
npm run preview
```
