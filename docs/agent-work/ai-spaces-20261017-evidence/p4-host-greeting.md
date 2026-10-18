# Phase 4 host greeting (local dev server, port 5210)

Host Breezy Yemi chose "DJ · DJ Spinz" with the description "Loud, funny, loves Afrobeats" (p4-390-host-sheet.jpg) and made an open house link. A second player ("Tunde Guest") came in through the link with a script that speaks the page's own protocol (POST /api/social/visit/link/enter, then the room socket's `join` home), because a second 3D browser tab stalls the browser tool. Frames the guest received:

    chat {"from":{"id":"spacehost.21c39417-…","name":"DJ Spinz","agent":true},"body":"Tunde don land! Welcome to Breezy’s crib—DJ Spinz dey bring loud vibes and Afrobeats energy!","speaker":"agent"}

The line was written by the model in the owner's persona and carries the AI mark (`agent: true`). A later MC line came back as a fragment ("Y"): the reasoning model had run out of its 70-token budget. Fixed: 400 tokens, and a fragment is replaced by the written line.
