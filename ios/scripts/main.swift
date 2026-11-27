// Run the same core test methods when Command Line Tools do not include XCTest.
import Foundation
class XCTestCase {}
func XCTAssertTrue(_ value: @autoclosure () throws -> Bool) rethrows { if try !value() { fatalError("Expected true") } }
func XCTAssertFalse(_ value: @autoclosure () throws -> Bool) rethrows { if try value() { fatalError("Expected false") } }
func XCTAssertEqual<T: Equatable>(_ a: @autoclosure () throws -> T, _ b: @autoclosure () throws -> T) rethrows { if try a() != b() { fatalError("Values differ") } }
func XCTAssertLessThanOrEqual<T: Comparable>(_ a: T, _ b: T) { if a > b { fatalError("Above upper bound") } }
func XCTAssertGreaterThanOrEqual<T: Comparable>(_ a: T, _ b: T) { if a < b { fatalError("Below lower bound") } }
func XCTAssertThrowsError<T>(_ expression: @autoclosure () throws -> T) { do { _ = try expression() } catch { return }; fatalError("Expected error") }
let suite = CoreTests()
suite.testOriginalHazardBoundaries()
suite.testMalformedBoxesAreRejected()
suite.testCancelledHelpCannotBecomeReady()
suite.testRepeatedTriggersDoNotExtendCountdown()
suite.testStationaryMotionAndWindowBounds()
suite.testSyntheticImpactAndRotationRaiseScore()
try suite.testIncidentPersistenceAndCorruptData()
print("7 portable core tests passed (same test methods as XCTest suite).")
