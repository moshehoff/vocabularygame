# אוֹצַר מִילִים וּפִתְגָמִים

מִשְׂחַק טריוויה בִּעֲבָרִית מְנוּקֶּדֶת (Vite + TypeScript).

## GitHub Pages

ה־workflow בונה את `dist` ודוחף אותו לענף **`gh-pages`** (באמצעות [peaceiris/actions-gh-pages](https://github.com/peaceiris/actions-gh-pages)).

### הגדרה חד־פעמית ב־GitHub

1. **Settings → Actions → General** → **Workflow permissions** → סמן **Read and write permissions** (נדרש כדי לדחוף לענף `gh-pages`).
2. **Settings → Pages** → **Build and deployment** → **Source**: **Deploy from a branch**  
   - Branch: **`gh-pages`**  
   - Folder: **`/`** (root)  
   - **לא** לבחור את `main` — שם נמצא קוד המקור בלי build, ולכן הדפדפן מנסה לטעון `/src/main.ts` שלא קיים ב־Pages.

3. דחוף ל־`main` — אחרי ריצה מוצלחת ב־**Actions**, רענן את האתר:  
   [https://moshehoff.github.io/vocabularygame/](https://moshehoff.github.io/vocabularygame/)

הבנייה משתמשת ב־`base: './'` ב־`vite.config.ts` כדי ש־נתיבי נכסים ו־`questions.json` יעבדו מתחת לתת־נתיב של Pages.

### בדיקה מקומית של build

```bash
npm ci
npm run build
npm run preview
```
