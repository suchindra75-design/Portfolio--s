# reveal-region

`region.py` made `public/portrait/reveal-region.png`, the mask that limits the cursor reveal to the head and neck.

It reads the two supplied portraits in `public/portrait/` and never changes them. Those two files' suits are offset by about 2–3 px and drawn slightly differently, so revealing outside the head would show a mismatched suit.

Run it only if the portraits change:

    python3 tools/reveal-region/region.py   # needs numpy, opencv-python, pillow, scipy
