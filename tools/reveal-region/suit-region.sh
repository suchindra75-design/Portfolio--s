#!/bin/sh
# Reveal region for the professional portrait (suit-portrait.webp) as the face layer.
#
# The original reveal-region.png fits the head and neck of the first face file, whose neck ran
# straight into the Spider-Man suit. The professional portrait has a white collar and a jacket from
# about y = 497 (in the 771 x 1018 portrait box), so this keeps the same head shape and fades the
# neck out just above the collar: lower in the middle, where the neck is bare skin down to about
# y = 535, and higher at the sides, where the collar is. Neither image is changed.
#
#   sh tools/reveal-region/suit-region.sh      (needs ffmpeg)
cd "$(dirname "$0")/../../public/portrait" || exit 1
ffmpeg -loglevel error -y -i reveal-region.png -vf "format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='alpha(X,Y)*(st(0,494+40*exp(-pow((X-395)/85,4)));st(1,clip((ld(0)-Y)/18,0,1));ld(1)*ld(1)*(3-2*ld(1)))'" reveal-region-suit.png
echo "wrote public/portrait/reveal-region-suit.png"
