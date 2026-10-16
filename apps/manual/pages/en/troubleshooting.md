# When something is off

**Which browser?** The latest Chrome, Edge or Safari, on a computer, tablet
or phone. Firefox isn't supported.

**The console says "WebGPU is not available".** That's fine: your browser has
no WebGPU, so Lux Studio uses WebGL 2, which looks the same.

**It's slow.** Close other heavy tabs. With many luminaires, only the 8
brightest cast shadows, precisely to keep things smooth.

**An IES luminaire's light looks odd.** Often that's simply how it is. Some
luminaires send almost no light straight down and spread it in a ring, or
send a lot upwards. Check its **Aim** too (tilt and pan).

**I undid too much.** **⇧⌘Z** redoes.

**The view takes a moment to appear.** Lux Studio waits for the luminaires,
furniture and textures to load, so it never shows a half-built scene. Until
then, an indicator shows it's loading. If something fails or takes over 15
seconds, it's shown simplified (a plain shape, a generic light or the
surface's plain colour) and everything else carries on.

**I want to start over.** The scene saves itself in this browser, so
reloading the page brings it back. To start another, use **New**: an empty
room or a template. Changed your mind? **⌘Z**.

**A shared link won't open.** It has to arrive whole: some messaging apps
cut it. If it's damaged, a notice says so and your scene doesn't change.
Ask whoever sent it to copy it again, or to send you the `.luxstudio.json`
file.

**I want to report a problem.** Open Lux Studio with `?debug` at the end of
the address. A box with technical details appears, and the browser's console
shows each step. Send a screenshot of both.
