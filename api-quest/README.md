# API Quest — a game to learn APIs

A single-page browser game that teaches HTTP methods, status codes, JSON,
authentication, and REST endpoint design through quizzes, drag-and-drop
matching, a live mock API console, and a boss battle.

## Run it

No build step. No server needed.

```bash
# either just open the file
xdg-open api-quest/index.html    # or `open` on macOS, double-click on Windows

# or serve the folder (recommended so the Console persists localStorage cleanly)
cd api-quest
python3 -m http.server 8000
# then visit http://localhost:8000
```

## What's inside

- **1. Learn** — cheat-sheet cards on HTTP methods, status codes, REST, auth.
- **2. Quiz Arena** — 8 multiple-choice questions with explanations.
- **3. Status Match** — drag status codes onto the scenarios they describe.
- **4. API Console** — send requests against an in-browser mock API
  (`/users`, `/users/:id`, `/courses`, `/me`) and see real status codes
  and JSON responses.
- **5. Endpoint Builder** — read a requirement and construct the correct
  method, path, and JSON body.
- **6. Boss Battle** — debug real-world API failures.

Progress (XP, level, lives, streak) is saved to `localStorage`. The footer
has a "Reset progress" button.

## Files

- `index.html` — structure and layout
- `style.css` — theme and layout
- `game.js` — state, quiz, match, mock API, builder, and boss logic
