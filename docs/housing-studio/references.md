# Housing studio asset and reference ledger

## Runtime asset subset

The studio uses a compact near-LOD subset copied from the already-owned Allworld asset library at revision `e810eb46dc7e6c7f4682b3b229991d60ca56b942`. The source repository is owner-authorized for this integration under **AGPL-3.0-or-later**; retain the license note with the shipped bundle. No external furniture or building pack was downloaded.

Selected files are the existing sofa, bed, wardrobe, armchair, dining chair/table, television, planter, washbasin, display fridge, floor lamp, and cooker. The unused banana bunch, security grille, construction-site toilet, shower seat, easel, and sink cabinet candidates were removed from this housing subset; the studio uses its approved procedural fallbacks for those shapes. The manifest records each source path, SHA-256, bytes, triangle count, bounds, dimensions, and a conservative collision-shape correspondence.

Measured subset totals:

- 12 near GLBs
- 164,752 bytes total (`wc -c` over `src/housing-studio/assets/*-near.glb`)
- 7,340 triangles total from the pinned generated catalogue
- 530 source assets remain available through the full phase-one catalogue; this subset is a housing convenience layer, not a duplicate library.

The files remain external URLs through `new URL('./assets/<id>-near.glb', import.meta.url).href`. They should be loaded lazily by the parent adapter and remain subject to the housing scene budget.

## Photo and architecture references

These pages are visual references only. Their photography, renders, plans, and copy are owned by the named architect/developer unless a page grants a separate license. They are not bundled as game textures or redistributed with the studio.

- [Kovet Realm Lagos projects](https://www.kovetrealm.com.ng/work/) — Lagos duplexes, flats, and family-home work.
- [The Building Practice Lagos portfolio](https://www.buildingpractice.biz/projects) — identifiable Ikoyi, Lekki, Banana Island, and other Lagos residential projects.
- [BUA Estate Kado](https://buaestate.com/projects/) — Abuja mansion styles and detached-duplex programme; treat imagery as marketing/reference material.
- [IPDC Abuja developments](https://ipdcgroup.com/) — named Abuja terrace, triplex, apartment, and residence developments.
- [CREATO Arquitectos, Alexence Villa](https://creatoarchitects.com/projects/alexence-villa) — identifiable **completed** Abuja villa page with completed dusk exterior and entrance/stair photography, plus construction-stage images. This is the preferred real completed Abuja reference for massing, stair arrival, glazing, roof plane, and interior/exterior transition.
- [Kayelan Design, Lekki apartment project](https://www.kayelandesign.com/portfolio/residential/lekki-apartment-project) — identifiable **completed** Lagos apartment photo reference, visually inspected for cream walls, taupe sofa, blue curtains/rug, warm POP ceiling coves, black window framing, and white cabinetry/wood. Reference only; photos remain rights-holder controlled.
- [Atelier Maison, Kado Residence](https://maisondecorstore.com/interior-design/project/kado-residence) — identifiable completed 2025 Kado Estate, Abuja interior project with living, dining, and bedroom photography; use for furnishing/finish relationships only.

The Alexence Villa and Kado Residence pages explicitly describe completed projects and show photographic project imagery. By contrast, BUA Estate and several portfolio cards are marketing renders or mixed render/photo galleries; treat them as style/massing references unless the page identifies a completed photograph.

## Rights boundary

CC0 mesh publishers researched earlier (Kenney, Quaternius, Poly Haven) are separate options and are intentionally not mixed into this unit. A permissive mesh license does not grant rights to architect/developer photographs. Use the existing owner-authorized Allworld meshes first; request written permission before shipping any reference image, render, plan, or scraped page content.

## Reproducibility evidence

```text
sha256sum src/housing-studio/assets/*.glb
wc -c src/housing-studio/assets/*.glb
```

Source metadata was read from the pinned phase-one generated packs and `/tmp/allworld-assets-phase1-e810eb46/catalogue.json`; no source archive or external binary was downloaded for this unit.
