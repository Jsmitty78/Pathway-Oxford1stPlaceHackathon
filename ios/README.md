# Pathway for iPhone — new implementation

This is a **new Swift implementation made in November 2026**, based on the surviving Pathway hazard detector, project documentation, and original app footage. It is not recovered original source. Intended device: **iPhone 15 Pro**, iOS 17 or later, portrait orientation.

## Included

- SwiftUI camera screen, visible demo/live modes, possible-obstacle boxes, pause/resume and spoken prompts.
- AVFoundation capture and Vision/Core ML integration. Live object detection requires the separately supplied model described in [MODEL.md](docs/MODEL.md). With no model, live mode explicitly runs as camera preview only.
- CoreMotion sampling, a bounded eight-second motion window, an experimental score, and optional JSON trace recording (up to 3,000 samples, approximately 60 seconds at 50 Hz).
- HELP countdown with cancellation, user-reviewed message composition, and a Phone app handoff. No autonomous SMS, automatic phone calls, or delivery claims.
- Persistent incident log (latest 500 entries), room labels, demo provenance, and JSON export.
- RoomPlan capture and saved room JSON on LiDAR devices. Captured room geometry is **not fused into camera detections or navigation**. Unsupported devices show a clear explanation.
- Xcode project, standalone Swift core tests, device test guide, and architecture notes.

## Open and run

1. Install full Xcode from Apple. This project needs an iOS 17+ SDK; use an Xcode version compatible with the iOS version installed on your phone.
2. Open `Pathway.xcodeproj`.
3. Select the **Pathway** target → **Signing & Capabilities** → select your Apple development team. Change the bundle identifier if needed.
4. Connect your iPhone 15 Pro, enable Developer Mode if prompted, and select it as the run destination.
5. Run. The initial mode is **Demo**, with synthetic data and contact tools disabled.
6. Open Settings, turn Demo mode off, close Settings, and tap Start. Grant camera and motion permissions.
7. Add a compatible detection model using [MODEL.md](docs/MODEL.md) for live object detection.
8. Use Room scan to capture a room. Monitoring pauses first. Finish the scan and export its JSON; close the scan and tap Start to resume monitoring.

The simulator can exercise UI/demo flows, but camera, CoreMotion, LiDAR and messaging need physical-device checks. No development team, API secrets, cloud services, or paid messaging credentials are embedded.

## Test the portable core

```sh
cd ios
swift test
```

On a Mac with only Command Line Tools (no XCTest), use `sh ios/scripts/test-core.sh` from the repository root. It runs the same seven test methods using a minimal assertion runner.

The package compiles the same `Sources/PathwayCore/PathwayCore.swift` file included in the app target. Tests cover hazard-rule boundaries, malformed inputs, cancellation, repeated HELP triggers, motion windows, synthetic motion and incident persistence. These tests do not validate the iOS framework integrations or fall-detection accuracy.

## Build the iOS app without signing

```sh
xcodebuild -project ios/Pathway.xcodeproj -scheme Pathway \
  -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' \
  CODE_SIGNING_ALLOWED=NO build
```

A shared scheme is included. After adding/removing Swift source or a `.mlpackage`, run `python3 ios/generate_project.py` to regenerate the project. Signing selections made in Xcode may need to be reapplied after regeneration.

## What remains

- Original source, original sensor traces and exact algorithm parameters remain missing.
- No model weights are bundled or verified on this device yet.
- Live camera/box alignment, permissions, interrupted sessions, RoomPlan, messages and physical-device performance need the checks in [DEVICE_TESTS.md](docs/DEVICE_TESTS.md).
- No calibrated depth, room relocalization, route planner, validated fall detector, caregiver backend, location sharing, CAD mount or background monitoring.
- Incidents store text and timestamps, not frame screenshots or video clips. Room scans are separate records.
- The iOS app is not a medical device or a reliable emergency alert system. A movement score describes device motion, not proof that a person has fallen.

## Documentation

- [Architecture and provenance](docs/ARCHITECTURE.md)
- [Model integration](docs/MODEL.md)
- [Physical-device acceptance checklist](docs/DEVICE_TESTS.md)
- [Verification record](docs/VERIFICATION.md)

The original repository's license and team credits continue to apply; see `../LICENSE` in the full repository or `LICENSE` in the standalone source bundle.
