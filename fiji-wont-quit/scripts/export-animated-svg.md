# Export an animated SVG as GIF

`export-animated-svg.js` seeks SMIL and CSS animations in Chromium and
captures PNG frames according to a JSON cue file. ImageMagick combines the
frames into an optimized GIF with an individual delay for each frame.

Install the Chromium browser once:

```sh
npx playwright install chromium
```

ImageMagick must provide the `magick` command.

Run the Fiji logo export with:

```sh
npm run export:animated-fiji-logo
```

The generic form is:

```sh
npm run export:animated-svg -- input.svg output.gif cues.json
```

Cue times and frame durations are milliseconds. `frameDuration` defines the
default sampling interval. Each entry in `ranges` overrides it for a time
range; `repeatEvery` repeats that range for looping animation sequences.

GIF delays have centisecond precision, so use frame durations divisible by
10. The Fiji cues use 10 fps normally, 20-25 fps for tool work and 50 fps
around hammer strikes.
