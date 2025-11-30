# vocapp

A lightweight vocabulary practice site that supports six difficulty levels, multiple-choice translation drills, and a persistent wrong-answer notebook stored in the browser.

## Features
- Load six CSV files (one per level) containing English words and Chinese translations.
- Choose a level to start or resume practice from your last saved position.
- Multiple-choice questions show an English prompt with four random distractors plus the correct answer.
- Record wrong answers automatically; optionally add correct-but-guessed answers to the wrong notebook.
- Practice the wrong notebook with the same multiple-choice flow and clear it at any time.
- Progress and notebook data are stored locally via `localStorage`.

## Running
Serve the project as static files (e.g., `python -m http.server 8000`) and open `index.html` in your browser. Edit the CSV files in `data/` to replace the sample content with your own vocabulary lists.
