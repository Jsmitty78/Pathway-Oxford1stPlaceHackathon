import Foundation

/// Normalized image coordinates, origin at the top left (not Vision's bottom left).
public struct Detection: Codable, Equatable, Identifiable {
    public var id: UUID
    public var label: String
    public var confidence: Double
    public var x: Double
    public var y: Double
    public var width: Double
    public var height: Double
    public init(label: String, confidence: Double, x: Double, y: Double, width: Double, height: Double) {
        self.id = UUID(); self.label = label; self.confidence = confidence
        self.x = x; self.y = y; self.width = width; self.height = height
    }
    /// Port of the surviving Python axis-aligned rule. The stricter malformed-input guard is new.
    public var isHazard: Bool {
        let values = [confidence, x, y, width, height]
        guard values.allSatisfy({ $0.isFinite }), confidence >= 0, confidence <= 1,
              x >= 0, y >= 0, width > 0, height > 0,
              x + width <= 1.000001, y + height <= 1.000001 else { return false }
        return !["person", "bed", "suitcase", "couch"].contains(label.lowercased())
            && confidence > 0.5 && y > 0.15 && y + height > 0.65
    }
}

public struct MotionSample: Codable, Equatable {
    public var time: Double
    public var accelerationG: Double
    public var gyroX: Double
    public var gyroY: Double
    public var gyroZ: Double
    public var pitch: Double
    public var roll: Double
    public init(time: Double, accelerationG: Double, gyroX: Double, gyroY: Double, gyroZ: Double, pitch: Double, roll: Double) {
        self.time = time; self.accelerationG = accelerationG
        self.gyroX = gyroX; self.gyroY = gyroY; self.gyroZ = gyroZ
        self.pitch = pitch; self.roll = roll
    }
    public var valid: Bool {
        [time, accelerationG, gyroX, gyroY, gyroZ, pitch, roll].allSatisfy(\.isFinite) && accelerationG >= 0
    }
    public var angularSpeed: Double { sqrt(gyroX * gyroX + gyroY * gyroY + gyroZ * gyroZ) }
}

/// New feature extraction; it is not recovered hackathon logic or a validated fall detector.
public struct MotionWindow {
    public private(set) var samples: [MotionSample] = []
    public init() {}
    public mutating func append(_ sample: MotionSample) {
        guard sample.valid else { return }
        if let last = samples.last, sample.time <= last.time { return }
        samples.append(sample)
        samples.removeAll { sample.time - $0.time > 8 }
        if samples.count > 1000 { samples.removeFirst(samples.count - 1000) }
    }
    public mutating func reset() { samples.removeAll() }
    public var score: Double {
        guard let first = samples.first, let last = samples.last, samples.count >= 10 else { return 0 }
        func ramp(_ value: Double, _ low: Double, _ high: Double) -> Double {
            min(1, max(0, (value - low) / (high - low)))
        }
        let minG = samples.map(\.accelerationG).min() ?? 1
        let maxG = samples.map(\.accelerationG).max() ?? 1
        let speed = samples.map(\.angularSpeed).max() ?? 0
        var angularAcceleration = 0.0
        for (a, b) in zip(samples, samples.dropFirst()) {
            let dt = b.time - a.time
            // Drop discontinuities and implausibly tiny time steps.
            if dt >= 0.005 && dt <= 0.1 {
                let dx = b.gyroX - a.gyroX, dy = b.gyroY - a.gyroY, dz = b.gyroZ - a.gyroZ
                angularAcceleration = max(angularAcceleration, sqrt(dx*dx + dy*dy + dz*dz) / dt)
            }
        }
        func angleDistance(_ a: Double, _ b: Double) -> Double { abs(atan2(sin(a-b), cos(a-b))) }
        let angle = max(angleDistance(first.pitch, last.pitch), angleDistance(first.roll, last.roll)) * 180 / .pi
        var stillness = 0.0
        for sample in samples.reversed() {
            guard abs(sample.accelerationG - 1) < 0.08, sample.angularSpeed < 0.12 else { break }
            stillness = last.time - sample.time
        }
        // Weights and ranges from src/pathwayEngine.js, themselves reconstructed assumptions.
        return min(1, max(0,
            ramp(0.75 - minG, 0, 0.45) * 0.14 + ramp(maxG, 1.3, 3.2) * 0.22
            + ramp(speed * 180 / .pi, 90, 400) * 0.16
            + ramp(angularAcceleration * 180 / .pi, 250, 1900) * 0.28
            + ramp(angle, 15, 75) * 0.10 + ramp(stillness, 1.5, 6) * 0.10))
    }
}

public struct HelpFlow: Equatable {
    public enum State: Equatable { case idle, countdown(deadline: Date), ready, cancelled }
    public private(set) var state: State = .idle
    public init() {}
    public mutating func begin(now: Date, seconds: TimeInterval = 15) {
        guard state == .idle || state == .cancelled else { return }
        state = .countdown(deadline: now.addingTimeInterval(max(0, seconds)))
    }
    public mutating func tick(now: Date) {
        if case let .countdown(deadline) = state, now >= deadline { state = .ready }
    }
    public mutating func cancel() { state = .cancelled }
    public mutating func reset() { state = .idle }
    public func remaining(now: Date) -> Int {
        if case let .countdown(deadline) = state { return max(0, Int(ceil(deadline.timeIntervalSince(now)))) }
        return 0
    }
    // Expiry ONLY enables user-initiated contact controls. It never sends a message or calls.
}

public struct Incident: Codable, Identifiable, Equatable {
    public var id: UUID
    public var date: Date
    public var kind: String
    public var detail: String
    public var room: String
    public var isDemo: Bool
    public init(kind: String, detail: String, room: String, isDemo: Bool, date: Date = Date()) {
        self.id = UUID(); self.date = date; self.kind = kind
        self.detail = detail; self.room = room; self.isDemo = isDemo
    }
}

public enum IncidentFile {
    public static func load(from url: URL) throws -> [Incident] {
        guard FileManager.default.fileExists(atPath: url.path) else { return [] }
        return try JSONDecoder().decode([Incident].self, from: Data(contentsOf: url))
    }
    public static func save(_ incidents: [Incident], to url: URL) throws {
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        let data = try JSONEncoder().encode(Array(incidents.suffix(500)))
        try data.write(to: url, options: .atomic)
    }
}
