# Screenings Office (/admin)

The Screenings Office is where you choose what the cinema screens play in the game: the five auditoriums and
the Starlight at Bayou Palace Cinemas, plus the TV in the Blackwater prison dayroom.

## Opening it

- **Locally:** run `npm run dev` and open <http://localhost:5173/admin>.
- **On the live site:** open `https://<your-site>/admin`.

Enter the 6-digit PIN. The default is `011491`. You stay signed in until you close the tab, or until you
press **Lock**.

### Change the PIN (recommended)

The default PIN is written in the server code (`server/showings-core.mjs`), so anyone who can read the repository
can see it. To set your own PIN on Netlify:

1. In Netlify, go to **Site configuration → Environment variables → Add a variable**.
2. Set the key to `ADMIN_PIN` and the value to your new 6-digit PIN.
3. Redeploy the site.

The PIN is checked only on the server. It is never part of the page your browser downloads. After 8 wrong
PINs from one network within 15 minutes, that network is locked out until the 15 minutes are up.

## Programming the screens

**Smart paste (the quickest way).** Paste one or more links into the box at the top. The links can be on
separate lines or separated by spaces or commas. You can also press ⌘V (Ctrl+V on Windows) anywhere on the
page. For each link, the dashboard:

- finds the title and channel from YouTube,
- skips the link if that film is already on a screen, or if you pasted it twice,
- suggests a screen: screens that are off first, then the screens whose showing has been running longest.

The suggestions use the cinema screens only. To put a film on the prison TV, choose it in the dropdown. Each
screen takes one film: if you pick a screen that another link already has, the two links swap screens.
When the lineup looks right, click **Publish lineup**.

**On a single screen:**

| Action | What it does |
|---|---|
| **Replace** | Paste a link for this screen only |
| **Restart** | Plays the current film from the beginning again for everyone |
| **Preview** | Plays the film in the dashboard |
| **Turn off** | Turns the screen dark |
| Drag a link onto the card | Puts that film on this screen straight away |
| Click the screen name | Rename the screen. The new name is saved when you press Enter |
| Volume slider | Sets how loud the screen plays in the game |

**Undo.** Most changes show a message with an **Undo** button.

### Which links work

- **YouTube videos:** youtube.com/watch, youtu.be, Shorts, live, embed, m.youtube.com and music.youtube.com
  links all work. Extra parts of the link such as `?si=` are ignored. A start time such as `&t=90` or `&t=1m30s`
  makes the film start there.
- **YouTube playlists:** a link with `list=` plays the playlist. YouTube's auto-generated "Mix" lists can't be
  shown on a screen. For a Mix link, only the video in the link is used.
- **Video files:** direct links to `.mp4` or `.webm` files work, and so do files in this site's `public/`
  folder (for example `/my-clip.mp4`). The dashboard checks each link before it can be published. It refuses
  links that point to a web page or a bot check instead of a video. It warns you when the host may stop the
  game from showing the video, because the host doesn't send CORS headers.
- **Not supported:** `.m3u8` and `.mpd` streams, and links from Vimeo, Twitch, TikTok and similar sites.
  YouTube videos that are private, or whose owner has turned off embedding, are also refused.

## How syncing works

Every showing records the moment it was published (`startedAt`). The game plays each screen from
`offset + (now − startedAt)`, and loops the film when it ends. Every player therefore sees the same moment
of the same film, like a real cinema.

- When you publish a new film on a screen, it starts from the beginning (or from its `&t=` start time).
- Screens you didn't change keep playing where they were.
- **Restart** starts the film again from the beginning.

The game reads `GET /api/showings` (public and read-only). Your changes reach running games within about a
minute.

## Where the data is kept

- **On Netlify:** in Netlify Blobs (store `cinema`, key `showings`). This needs the site to be deployed on
  Netlify. Nothing has to be set up: the function `netlify/functions/showings.mjs` is deployed with the site.
- **Locally (`npm run dev` / `npm run preview`):** in `.data/showings.json`, which git ignores. To go back to
  the built-in programme, delete the `.data/` folder. Deleting it also clears any PIN lockout.

The screens' lineups on your computer and on the live site are kept separately.

## For developers

| File | What's in it |
|---|---|
| `server/showings-core.mjs` | All the logic: defaults, validation, link parsing, YouTube oEmbed lookups, PIN checks and lockouts, the request handler |
| `netlify/functions/showings.mjs` | The Netlify Function (v2) that serves `/api/showings`, with Netlify Blobs storage |
| `vite.config.js` (`bayouShowings`) | The same API for the dev and preview servers, with file storage, plus the `/admin` rewrite |
| `admin.html`, `src/admin/` | The dashboard: a separate page that never loads the game |

## The Starlight: 360° and VR

The Starlight is a 360° dome. Paste any 360° or VR YouTube link onto its card and it plays all round the
audience: the film turns as each viewer looks about. You can also use a link to a 360° or 180° video file.

- **Format** (for video files): 360° (all round), or 180° VR (the front half).
- **VR file**: Mono, Top / bottom, or Side by side, for stereo VR files (the left eye is shown).

YouTube 360° and VR videos don't need either setting. A YouTube video that isn't 360° plays on a flat screen at
the front of the dome.

## Picture shape (black bars)

If a YouTube film has black bars above and below its picture, set **Picture** on its screen's card to its shape
(Widescreen 1.85 or Scope 2.39). The screen then fills edge to edge. Video files are trimmed automatically.
