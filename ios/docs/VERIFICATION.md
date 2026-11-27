# Verification — 27 November 2026

| Check | Status |
|---|---|
| Existing browser `npm run check` | Passed: 27 tests and JavaScript syntax checks |
| Swift core compilation | Passed with Apple Swift 6.1.2 |
| Swift app syntax parsing | Passed; parsing does not resolve Apple framework APIs |
| Xcode project and Info.plist syntax | Passed `plutil -lint` |
| Core behavior tests | Passed: 7 test methods using portable runner; full XCTest CI rerun pending |
| iOS simulator compilation | Pending GitHub/Xcode check |
| iPhone 15 Pro | Not run |
| Detector model conversion/inference | Not run; weights not included |
| RoomPlan and contact integrations | Source implemented; physical-device checks pending |

Full Xcode is not installed on the authoring Mac. `swift test` compiled the core but could not load XCTest. `scripts/test-core.sh` runs the same test methods without XCTest when only Command Line Tools are available. The GitHub workflow uses normal XCTest and a simulator build on a macOS runner. Neither test path establishes real-world fall detection or navigation accuracy.
