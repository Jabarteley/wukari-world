# Retention UI evidence

All captures are from the isolated local preview on port 5176 with synthetic character Jolly Tunde. They are not production or physical-device evidence.

- `final-main-achievements.png`: saved-character reload against combined source `376285c0314dba05e0703a4e43b8666037384c8e`, 2026-10-14 23:40 UTC. Earned Wayfinder remains pinned and displayed at home; the lifetime collected mission count remains one. The same reload also showed rhythm one active day and the saved season plan. Full viewport 742 by 1344; no viewport override remains.
- `joined-main-wayfinder-375.png`: earlier joined-source view at 375px.
- `achievements-320.jpg`, `achievements-375.jpg`, `achievements-desktop.jpg`: responsive layout checks. The 320px tab layout uses two rows; the tabs retain 44px targets and no horizontal overflow was observed.
- `wayfinder-earned-375.jpg`, `wayfinder-home.jpg`: earning through real travel, pinning and home plaque display.
- `saved-reward-after-midnight.png`: the actual Lagos-day rollover preserved yesterday's completed ₦250 mission. It subsequently collected once and remained collected after reload; the new daily display counter remained at zero.

The earlier captures precede the final cache-first merge. Final reload confirms saved progress still projects correctly; it does not re-prove every historical journey or a complete episode playthrough. Local rhythm/milestone/season flags are QA settings; production defaults are off/off/unset.
