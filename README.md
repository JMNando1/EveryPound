# Every Pound — Monthly Money Tracker

A private, offline-first budgeting web app you install on your phone like a normal app. It tracks your monthly income, shows where every pound goes across your own categories, and measures progress toward a savings goal.

**Privacy is the whole point.** There is no server, no account, no sign-up, and no analytics. Every figure you type is stored only in your own phone's browser storage. Nothing is ever transmitted anywhere — which is why it is safe to host the *code* publicly while your *numbers* stay completely private to you.

---

## What it does

- Set your monthly take-home income and your own spending categories
- Enter a **Budget** and an **Actual** for each category; the app shows what's left and colours overspend in red, underspend in green
- A live **allocation bar** shows the share of your income each category consumes
- Track a **savings goal** with a target amount and date — the app tells you the monthly pace you need
- Switch between months; budgets carry forward automatically, you just fill in each month's actuals
- **Back up / restore** your data as a JSON file you control
- Works fully **offline** once installed

## Deploy it free on GitHub Pages

1. Create a new repository on GitHub (public is fine — no personal data is in the code).
2. Upload every file in this folder, keeping the structure:
   ```
   index.html
   styles.css
   app.js
   manifest.webmanifest
   sw.js
   icons/icon-192.png
   icons/icon-512.png
   icons/icon-512-maskable.png
   ```
3. In the repository, go to **Settings → Pages**.
4. Under **Build and deployment → Source**, choose **Deploy from a branch**, pick the `main` branch and the `/ (root)` folder, then **Save**.
5. Wait about a minute. GitHub gives you a live URL like `https://yourname.github.io/your-repo/`.
6. Open that URL on your phone. See `USER_GUIDE.md` for how to install it to the home screen.

That's it. Every visitor gets a blank tracker that saves only to their own device.

## Local preview (optional)

Because it uses a service worker, open it through a small local server rather than double-clicking the file:

```bash
cd money-tracker
python3 -m http.server 8080
# then visit http://localhost:8080
```

## Tech notes

- Plain HTML, CSS, and vanilla JavaScript — no build step, no dependencies to install.
- Data model lives in `localStorage` under the key `everyPound.v1`.
- `sw.js` caches the app shell and the Google Fonts for offline use.
- To reset during testing, clear site data in your browser's settings.

## Licence

Do as you like with it. Provided as-is, with no warranty. It is a personal-organisation tool, not regulated financial advice.
