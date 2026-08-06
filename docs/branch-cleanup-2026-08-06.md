# Branch cleanup manifest — 2026-08-06

Operator-approved stale sweep (this session, same pass as the pipeline repo's `docs/branch-cleanup-2026-08-06.md`). Restore any deleted branch with:
`git push origin <sha>:refs/heads/<branch>`

Kept: `claude/new-session-3l99vs` (default/production), `claude/handoff-fg4rgj` (active session), and every branch with commits after 2026-07-15 that is not merged by ancestry. No open PRs existed at sweep time.

| branch | tip sha | last commit | reason |
|---|---|---|---|
| claude/audit-monolith-extract-xf4dqh | e0ffd6c1bf2570a1951e28112fc24a9bf77fe7ee | 2026-06-29 | stale (pre-2026-07-15, squash-era) |
| claude/audit-safetynet-xf4dqh | 7734a908d9153d5ca6bb965884ef863e5961b87e | 2026-06-29 | stale (pre-2026-07-15, squash-era) |
| claude/audit-security-xf4dqh | 26a18b1677edd00048fff9ae1113c2e54629ac4f | 2026-06-29 | stale (pre-2026-07-15, squash-era) |
| claude/aurora-character-bench-read-d95b6j | cc960403b02f69e02e3989677f8f8c969869ab84 | 2026-07-04 | stale (pre-2026-07-15, squash-era) |
| claude/casting-de-modaled-phase2-skinrd | 5127c577ce4555e2a2459a722dc674fa74dc1be5 | 2026-07-04 | stale (pre-2026-07-15, squash-era) |
| claude/casting-followup-xf4dqh | 88c77143b607b7b750b4ebb67930e6e7b987331a | 2026-06-29 | stale (pre-2026-07-15, squash-era) |
| claude/casting-migration-namespace-xf4dqh | 921cd208ef8477680323563e33c12152b92cc30b | 2026-06-29 | stale (pre-2026-07-15, squash-era) |
| claude/casting-proposal-xf4dqh | e53951bf3bbcdd9b497ff867e6bb58effa988538 | 2026-06-29 | stale (pre-2026-07-15, squash-era) |
| claude/casting-reconcile-xf4dqh | 2d504862935a0eee5ae71dfd4e12062e4efee680 | 2026-06-29 | stale (pre-2026-07-15, squash-era) |
| claude/casting-studio-voice-upgrade-qa2400 | 45aa21c564df63cc2204b4c91e7e6a3c9e44b239 | 2026-07-02 | stale (pre-2026-07-15, squash-era) |
| claude/casting-studio-xf4dqh | fcf07f3d120d5c1958fe4ab6dd547927b0162145 | 2026-06-29 | stale (pre-2026-07-15, squash-era) |
| claude/channel-first-phase1-build-gji3vi | f3389458b65e8a071f874086f2a88058a255f1ab | 2026-07-03 | stale (pre-2026-07-15, squash-era) |
| claude/channel-first-phase1-cont-40jine | c2c7daaf10f9a5b779001e51863cb1d0fe20acf1 | 2026-07-03 | stale (pre-2026-07-15, squash-era) |
| claude/channel-first-phase1-cont-la0yh9 | 4e6ea38005e194c5f34fa842b691e4bce1d0d2cd | 2026-07-03 | stale (pre-2026-07-15, squash-era) |
| claude/channel-first-phase1-cont-t38jxy | eb9c5f1e74ac4df93aac09a63b0ec31ad05f9372 | 2026-07-04 | stale (pre-2026-07-15, squash-era) |
| claude/channel-first-phase1-cont-x8y66i | 9d8c90bf439c1c2ec33cee2f99c4e50b075dfe9e | 2026-07-04 | stale (pre-2026-07-15, squash-era) |
| claude/channel-first-phase1-dx9gan | 3e449cecf85c58b2ff98775ae1364e3618082be7 | 2026-07-02 | stale (pre-2026-07-15, squash-era) |
| claude/channel-profiles-data-xf4dqh | 8ded5c75d18e3a75a9685413f65f958da8265ecd | 2026-06-30 | stale (pre-2026-07-15, squash-era) |
| claude/channel-profiles-editor-xf4dqh | 9d37558bac8e724f0b8ba4bf4627a930caee01ca | 2026-06-30 | stale (pre-2026-07-15, squash-era) |
| claude/channel-profiles-formreset-fix | 271c67e0218a3c61af5711f843e0b8528eefbb89 | 2026-06-30 | stale (pre-2026-07-15, squash-era) |
| claude/claude-md-handoff-9j18u2 | f879e29eff008c47a1843803629d7f0cf3a7b0bf | 2026-08-05 | merged-by-ancestry |
| claude/content-gen-dashboard-architect-n1sagy | 6984535a877b83548de01ae69017d79bb9fd9808 | 2026-07-01 | stale (pre-2026-07-15, squash-era) |
| claude/cost-box-per-character-xf4dqh | ea306815f4bc515742515bb1dde494e3673ff628 | 2026-06-29 | stale (pre-2026-07-15, squash-era) |
| claude/dashboard-health-audit-xf4dqh | f42ce7b0be868fe6d3d9ae6fc1c5213c00e1a7c5 | 2026-06-29 | stale (pre-2026-07-15, squash-era) |
| claude/dashboard-slice-count-pof88m | 2713480ea833476d072ad5756f6e71be60a27fa4 | 2026-06-28 | stale (pre-2026-07-15, squash-era) |
| claude/decomp-useCharacters | 2d3fe1eba0a4f01a699c0bcbded624f2404e8fdd | 2026-07-01 | stale (pre-2026-07-15, squash-era) |
| claude/decomp-useEpisodes-xf4dqh | db93b6bd350f5bfb5fff73d306df46ab1a0893b2 | 2026-06-30 | stale (pre-2026-07-15, squash-era) |
| claude/decomp-useIdeas | b34f83ba783fec21b20473eaa0dad4ee66a4efbc | 2026-07-01 | stale (pre-2026-07-15, squash-era) |
| claude/decomp-useJobs-xf4dqh | 59aa4c1c26e2c8d784926b727521967dedd1b548 | 2026-06-30 | stale (pre-2026-07-15, squash-era) |
| claude/decomp-useReceipts-drilldown | 9b1dd8a9cef75dff90b191ace049268279d96b61 | 2026-06-30 | stale (pre-2026-07-15, squash-era) |
| claude/decomp-useReceipts-xf4dqh | 822efeefcd0a377022caea3b99885e861cbdc204 | 2026-06-30 | stale (pre-2026-07-15, squash-era) |
| claude/followups-xf4dqh | e51b05bb5dc2f7c4ffd215b9752556362713074f | 2026-06-29 | stale (pre-2026-07-15, squash-era) |
| claude/gemini-3-models-xf4dqh | 465dd83337dddef0963cec4fc660729ceded6126 | 2026-06-29 | stale (pre-2026-07-15, squash-era) |
| claude/gemini-rest-access-xf4dqh | e1add23d12996545b4c3a1773e426997d0fb1a57 | 2026-06-29 | stale (pre-2026-07-15, squash-era) |
| claude/gemini-wrapper-fallback-xf4dqh | fc6a895b6e3341e88c4ec4a6f688874d91408b3b | 2026-06-29 | stale (pre-2026-07-15, squash-era) |
| claude/go-43k81l | 6af92e8353880faa80ddd49bb3510a2635491624 | 2026-07-05 | stale (pre-2026-07-15, squash-era) |
| claude/go-o6lvrb | a28c6a06e03024131ba945ba63934774a45896d4 | 2026-07-23 | merged-by-ancestry |
| claude/jobs-0016-publish-retry-fix-xf4dqh | 3be6502755f2906a58be0e2f0e3410abb59a53df | 2026-06-30 | stale (pre-2026-07-15, squash-era) |
| claude/jobs-0016-wiring-xf4dqh | 8615f25ece80b48978ed2ee74cd2e51775b719ba | 2026-06-30 | stale (pre-2026-07-15, squash-era) |
| claude/jobs-enqueue-xf4dqh | 5a11bd665472530f5484d8090da373985215beae | 2026-06-29 | stale (pre-2026-07-15, squash-era) |
| claude/optimize-claude-usage-zfsxof | c1a41e25501f5fd527c00dee460edd6f09364d5a | 2026-07-08 | stale (pre-2026-07-15, squash-era) |
| claude/overlay-modal-fix-xf4dqh | d6f3692ac22cd82744f1db68dbafb554f4987348 | 2026-06-29 | stale (pre-2026-07-15, squash-era) |
| claude/ratify-harness | 9d989b18a6dce662e05963623cff8c69126b26d4 | 2026-07-01 | stale (pre-2026-07-15, squash-era) |
| claude/reels-audit-pass-7sqmdk | d2028175211bcf2a6810588ac140c74d419845f7 | 2026-07-05 | stale (pre-2026-07-15, squash-era) |
| claude/reels-pipeline-coord-cazhsv | c637f46223b9c38b01262bd35734e92b053431b1 | 2026-08-02 | merged-by-ancestry |
| claude/segment-active-state-xf4dqh | 2ee696f182f10ba5488085263925e0d7d67e8117 | 2026-06-29 | stale (pre-2026-07-15, squash-era) |
| claude/session-handoff-docs-xf4dqh | 70e20b94d8161e36133a3bb7c67b496e5eb9bbc5 | 2026-06-30 | stale (pre-2026-07-15, squash-era) |
| claude/session-handoff-governance-k79340 | 0da31e3d485fc9463511a299e803edd4e10efe37 | 2026-07-02 | stale (pre-2026-07-15, squash-era) |
| claude/session-handoff-governance-xbbt4p | ee54d3cc7598e30f5887642d91e3d4b915aafd20 | 2026-07-02 | stale (pre-2026-07-15, squash-era) |
| claude/session-handoff-review-devqkm | 8485f28b96a16d5f490dca8826e2b983c1666b61 | 2026-07-02 | stale (pre-2026-07-15, squash-era) |
| claude/ux-improvements-xf4dqh | 7211595798ecc975d2849001a89ca27bee91f6ae | 2026-06-29 | stale (pre-2026-07-15, squash-era) |
| claude/ux-nits | 60899ce8980542d7f371f110e51a7a64a7cd470d | 2026-07-01 | stale (pre-2026-07-15, squash-era) |
| claude/wire-aurora-home-5b-lleyyg | 081a04a2a1590b731ba43248a4c35f45f177baca | 2026-07-13 | stale (pre-2026-07-15, squash-era) |
