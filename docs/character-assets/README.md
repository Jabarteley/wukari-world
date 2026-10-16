# Native character asset selection and licences

## Actual selection, not folder labels

On16October2026 the original lab and game `characters.js` were read side by side. Both resolve clothing by merging item.bodyVariants first, then body.variants. The selected final-pass catalogue contains final-pass skirt URLs in item records, but its body.variants overrides select **round12** for both `female-elegant-01` and `fitted-skirt-01`, on both bodies.

The release preserves those actual lab-resolved skirts. It does not silently substitute the unused Franky mini-skirt derivative. The runtime catalogue must retain one consistent selected URL per item/body; conflicting historical fallback pointers are removed from the shipping catalogue. `scripts/native-character-assets.mjs` records resolved URLs and hashes; no filename alone establishes asset identity.

## Asset terms

The selected round12 skirts derive from official MakeHuman `female_elegantsuit01` lower clothing and `female_sportsuit01`/elegant upper clothing, with the existing CC0 source records and locally authored pose morphs. Body, hair, shoes, eye textures and other fitted outfits use the recorded official MakeHuman System Assets and target sources. MPFB2.0.18 is separate GPL authoring software; it is not a blanket asset licence.

The unselected Franky source remains preserved in the original lab. Its pack manifest says CC0 while source headers say AGPL3. Anthony expressly authorized retaining skirts in production after being informed; the release does not reclassify that unselected source as CC0-only or ship its unused files.

## Motion

The selected iteration2-upper-palm animation derives from locally authored native-rig motion, CMU subject07 trial02 walking and subject09 trial01 running, and the CC0 Mesh2Motion greeting. Local edits do not change source terms.

The data used in this project was obtained from mocap.cs.cmu.edu. The database was created with funding from NSF EIA-0196217.

CMU permits commercial-product inclusion but prohibits direct resale of motion data, including converted forms. Motion is used within Allworld, not offered as a standalone library. Raw research ASF/AMC files are not shipped. Source: https://mocap.cs.cmu.edu/ .

## Evidence boundaries

Original lab sources and rejected experiments remain preserved locally. Runtime download inventory, exact hashes, and browser acceptance must refer to the selected release commit. Neither numerical probes nor desktop emulation prove physical-phone performance. Public runtime attribution is in public/character-lab/THIRD_PARTY_NOTICES.md; Allworld code retains the repository AGPL licence.
