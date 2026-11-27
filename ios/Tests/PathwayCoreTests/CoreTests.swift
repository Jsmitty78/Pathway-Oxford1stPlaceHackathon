#if canImport(XCTest)
import XCTest
@testable import PathwayCore
#endif

final class CoreTests: XCTestCase {
    func object(_ label: String = "teddy bear", confidence: Double = 0.9, y: Double = 0.5, height: Double = 0.3) -> Detection {
        Detection(label: label, confidence: confidence, x: 0.2, y: y, width: 0.3, height: height)
    }
    func testOriginalHazardBoundaries() {
        XCTAssertTrue(object().isHazard)
        for label in ["person", "bed", "suitcase", "couch"] { XCTAssertFalse(object(label).isHazard) }
        XCTAssertFalse(object(confidence: 0.5).isHazard)
        XCTAssertFalse(object(y: 0.15, height: 0.7).isHazard)
        XCTAssertFalse(object(y: 0.45, height: 0.2).isHazard)
        XCTAssertTrue(object(y: 0.45, height: 0.21).isHazard)
    }
    func testMalformedBoxesAreRejected() {
        XCTAssertFalse(object(confidence: .nan).isHazard)
        XCTAssertFalse(object(y: 0.8, height: 0.5).isHazard)
        XCTAssertFalse(object(y: -0.1, height: 1).isHazard)
        XCTAssertFalse(object(height: -.infinity).isHazard)
    }
    func testCancelledHelpCannotBecomeReady() {
        let start = Date(timeIntervalSince1970: 100)
        var flow = HelpFlow(); flow.begin(now: start)
        XCTAssertEqual(flow.remaining(now: start), 15)
        flow.cancel(); flow.tick(now: start.addingTimeInterval(100))
        XCTAssertEqual(flow.state, .cancelled)
    }
    func testRepeatedTriggersDoNotExtendCountdown() {
        let start = Date(timeIntervalSince1970: 100)
        var flow = HelpFlow(); flow.begin(now: start)
        flow.begin(now: start.addingTimeInterval(10))
        flow.tick(now: start.addingTimeInterval(15))
        XCTAssertEqual(flow.state, .ready)
    }
    func testStationaryMotionAndWindowBounds() {
        var window = MotionWindow()
        for i in 0..<2000 { window.append(MotionSample(time: Double(i)/50, accelerationG: 1, gyroX: 0, gyroY: 0, gyroZ: 0, pitch: 0, roll: 0)) }
        XCTAssertEqual(window.score, 0)
        XCTAssertLessThanOrEqual(window.samples.count, 401)
        let count = window.samples.count
        window.append(MotionSample(time: 0, accelerationG: .nan, gyroX: 0, gyroY: 0, gyroZ: 0, pitch: 0, roll: 0))
        XCTAssertEqual(window.samples.count, count)
    }
    func testSyntheticImpactAndRotationRaiseScore() {
        var window = MotionWindow()
        for i in 0..<100 {
            window.append(MotionSample(time: Double(i)/50, accelerationG: i == 20 ? 0.25 : (i == 21 ? 3.5 : 1), gyroX: i == 21 ? 8 : 0, gyroY: 0, gyroZ: 0, pitch: i > 21 ? 1.5 : 0, roll: 0))
        }
        XCTAssertGreaterThanOrEqual(window.score, 0.8)
        XCTAssertLessThanOrEqual(window.score, 1)
    }
    func testIncidentPersistenceAndCorruptData() throws {
        let folder = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: folder) }
        let url = folder.appendingPathComponent("incidents.json")
        XCTAssertEqual(try IncidentFile.load(from: url), [])
        let record = Incident(kind: "hazard", detail: "teddy bear", room: "Living room", isDemo: true)
        try IncidentFile.save([record], to: url)
        XCTAssertEqual(try IncidentFile.load(from: url), [record])
        try Data("invalid".utf8).write(to: url)
        XCTAssertThrowsError(try IncidentFile.load(from: url))
    }
}
