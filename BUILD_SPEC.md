BUILD SPEC: New Era Command Center (Mobile PWA, v1)

Build a beautiful, branded, offline-first Progressive Web App (PWA) for a New
Era Services business owner to run his "command center" from his Android phone.
Pure static HTML/CSS/JS, no build step, no framework, no CDNs, no external
network calls. Everything self-contained and stored on the device (IndexedDB).
This is a real, working app — not a stub.

PROJECT LOCATION: current directory. Create files here.

BRANDING (New Era Services — lawn care & property maintenance):
- Brand colors: primary dark forest green #2E7D32, deep green #1B5E20, lime
  accent #8BC34A, golden brown #B8860B. Backgrounds white/very light.
- The logo image already exists at assets/logo.jpg. Show it in the app header.
- App name shown: "New Era Command Center".
- Home-screen PWA name: "Command Center".
- Icons are referenced at icons/icon-192.png and icons/icon-512.png (they will
  be supplied separately — just reference them in the manifest, don't create
  binary PNGs).

DELIVERABLES (plain static files, no bundler):
  index.html
  styles.css
  app.js
  manifest.webmanifest   (offline-first PWA: start_url "./", scope "./",
                          icons ./icons/icon-192.png & ./icons/icon-512.png)
  sw.js                  (precache: './', index.html, styles.css, app.js,
                          manifest.webmanifest, assets/logo.jpg, icons)
  .nojekyll
  README.md (5 lines)

FUNCTIONAL REQUIREMENTS (v1 — mobile first, big tap targets, one-handed):

1. SECURE PASSCODE LOCK (GLOVE-FRIENDLY — must NOT annoy the field worker)
   - The passcode is OPTIONAL. On first open, offer to set a 4-6 digit PIN but
     allow the user to skip it entirely ("Skip for now" / "No passcode").
   - If a PIN is set, the user unlocks ONCE per session — they do NOT re-enter
     it on every app open. Stay unlocked until the session auto-locks.
   - Auto-lock only after a period of inactivity (default 15 minutes of no
     interaction). A quick glance/check within the window needs NO passcode.
   - Provide a "Stay unlocked on this phone" toggle in Settings — when ON, the
     app never asks for the PIN again on that device (PIN can still be set/used
     as a manual lock or for sensitive actions). When OFF, use session +
     inactivity auto-lock.
   - Store only a SHA-256 hash of the PIN in IndexedDB — never the raw PIN.
   - Lock screen: large numeric keypad with big buttons (glove-friendly),
     shows an error on wrong PIN, and a "Change PIN" path in Settings (asks for
     current PIN first). If no PIN is set, the lock screen never appears.

2. AGENT STATUS BOARD (the core screen)
   - A roster of AI agents. Each agent card shows: name, role, a status pill
     (Online / Idle / Offline), and a short note. The roster is FULLY
     EDITABLE in-app (add / edit / delete agents) and stored in IndexedDB.
   - Pre-populate a starting roster (user will edit to match his setup):
       Arke  — "Orchestrator"
       Iris  — "Lead Agent"
       Clover — "Ops"
       Lexi  — "Records"
       Scout — "Research"
       Venture — "Startup"
   - Cards are large, thumb-friendly, and tappable.

3. VOICE-FORWARD (for field use, hands-free)
   - A prominent microphone button on the home screen. Tap it, speak, and the
     speech is transcribed into a note (use the Web Speech API
     SpeechRecognition; if unavailable, degrade to a text field with a note).
   - A "Voice Briefing" button that reads the current status board / a briefing
     text aloud using speechSynthesis (text-to-speech). Pick a clear voice,
     give buttons to play / stop / pause.
   - Store voice notes in the "Command Pad" with a timestamp. Voice notes can be
     played back (text-to-speech) or read.

4. COMMAND PAD (secure notes)
   - A note pad where the user can jot instructions/orders. Add note, list
     notes (newest first), delete notes. Each note has a timestamp. Notes
     persist in IndexedDB (offline). "Read aloud" button per note.

5. TODAY / BRIEFING
   - A simple "Today" card showing the date and a short editable briefing/
     schedule text the user can update (stored locally). A "Read briefing"
     button reads it aloud. Editable in-app.

6. OFFLINE-FIRST + PWA
   - Service worker registered; app shell precached so it loads with no signal.
   - All data (PIN hash, agents, notes, briefing) in IndexedDB — never leaves
     the device in v1.

7. UX / STYLE
   - Mobile-first, clean, modern. Dark-green header with the logo, white/light
     body, green accents. Large touch targets (min 44px). Bottom navigation bar
     with: Home (board), Notes (command pad), Today, Settings (lock / PIN / about).
   - Toast feedback on actions (note saved, PIN changed, etc.).
   - Empty states ("No notes yet — tap the mic to add one").
   - Accessible labels on all buttons.

VERIFY before finishing: the files exist; index.html element IDs match what
app.js reads; sw.js and manifest use relative "./" paths; node --check app.js
passes. Do not run a browser. Report the file list and a one-paragraph summary.
