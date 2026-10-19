# Operator switches: every on/off feature setting

- Status: in delivery (PR #56)
- Checkout: ~/work/joinallworld, branch `claude/switch-everything` from origin/main 577b0c7d5
- Owned paths: server/routes/switches-mod.ts, server/switches-mod.test.ts, src/types/switches.ts, the switches line of src/types/protocol.ts
- Change: `POST /api/mod/switches` reaches every boolean feature setting (residents, AI calls, house agents, model-written lines, chat pictures,
  phone notifications, public feed media, copy my real house, danfo park, launch bonus); `GET /api/mod/switches` reads them. The Detty
  December preview stays off the list.
- Evidence: typecheck clean; server/switches-mod.test.ts, server/registry.test.ts, src/types/protocol.test.ts pass (19).
- Live: the ten switches the live build already had were turned on with the operator token on 2026-10-19.
- Next step: after CI, merge, release, then turn on the new switches (residentsShadow false) and read them back with GET.
