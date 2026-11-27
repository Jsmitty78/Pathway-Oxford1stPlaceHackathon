# iPhone 15 Pro acceptance checks

Record iPhone model, installed iOS, Xcode version, app commit and detector hash. These checks are pending; do not infer hardware success from the portable tests.

1. **First launch:** demo label visible; Start shows a synthetic box; no permissions requested; HELP expires without contacting anyone; cancellation is logged as demo.
2. **Permissions:** turn demo off; test camera approval and denial. Test motion denial/restriction. Errors must be visible. No stale hazard boxes should remain after stopping or a detector failure.
3. **No model:** live camera preview works, but UI explicitly says no detector model. No fake live detections appear.
4. **Model:** install the documented detection model; verify teddy bear/chair recognition, labels, ignored classes and strict confidence filtering. Check alignment at all image edges and near the screen boundary. Confirm no steering/distance claims.
5. **Pause/background:** pause stops camera/motion; switch apps/lock screen during monitoring and HELP. No unattended messages/calls. Resume requires Start; do not carry old samples into a new session.
6. **Motion:** record ordinary, safely held device movements for up to 60 seconds; export JSON; verify monotonic timestamps and units. Do not deliberately fall or drop hardware. Do not label ordinary movement data as validated fall data.
7. **HELP:** cancel before expiry; wait beyond deadline; verify no contact. Trigger repeatedly; countdown must not reset unexpectedly. Expiry requires a tap to review a text or open a call.
8. **Contacts:** use a consenting test recipient. Check invalid/missing numbers, messaging unavailable, cancelled message, failed send, submitted message and Phone handoff. The incident log must not claim delivery or a completed call.
9. **Persistence:** relaunch; incidents remain. Export and inspect timestamps, rooms and demo flags. Corrupt a test copy of the log using Xcode's container tools and confirm the app reports the error without overwriting it.
10. **RoomPlan:** monitoring pauses before scan. Complete a scan, export JSON, inspect captured dimensions/objects, dismiss and explicitly restart monitoring. Test unsupported hardware and camera denial. This scan must not be labeled a safe walking route.
11. **Accessibility:** VoiceOver labels, large text, contrast and reachable controls; verify synthetic/live labels remain visible. Portrait is the supported orientation.
12. **Performance:** run for 10 minutes; record battery/thermal behavior, Vision processing rate and any dropped frames. Five requests/second is a throttle, not a measured performance promise.
