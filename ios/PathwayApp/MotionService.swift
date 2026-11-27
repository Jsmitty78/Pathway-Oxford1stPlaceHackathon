import CoreMotion
import Foundation

final class MotionService {
    private let manager = CMMotionManager()
    private var window = MotionWindow()
    private(set) var trace: [MotionSample] = []
    private(set) var recording = false
    var onUpdate: ((Double) -> Void)?
    var onStatus: ((String) -> Void)?
    var onRecordingFinished: (() -> Void)?
    func start() {
        guard manager.isDeviceMotionAvailable else { onStatus?("Motion sensor unavailable."); return }
        window.reset()
        manager.deviceMotionUpdateInterval = 1.0 / 50
        manager.startDeviceMotionUpdates(to: .main) { [weak self] motion, error in
            guard let self else { return }
            guard let motion, error == nil else {
                self.onStatus?("Motion unavailable: \(error?.localizedDescription ?? "no samples")"); return
            }
            let a = motion.userAcceleration, g = motion.gravity, r = motion.rotationRate
            let magnitude = sqrt(pow(a.x+g.x, 2) + pow(a.y+g.y, 2) + pow(a.z+g.z, 2))
            let sample = MotionSample(time: motion.timestamp, accelerationG: magnitude,
                                      gyroX: r.x, gyroY: r.y, gyroZ: r.z,
                                      pitch: motion.attitude.pitch, roll: motion.attitude.roll)
            self.window.append(sample)
            if self.recording {
                self.trace.append(sample)
                if self.trace.count >= 3000 { self.recording = false; self.onRecordingFinished?() }
            }
            self.onUpdate?(self.window.score)
        }
        onStatus?("Motion active. Experimental score; not a fall diagnosis.")
    }
    func stop() { manager.stopDeviceMotionUpdates(); window.reset(); recording = false }
    func beginRecording() { trace.removeAll(); recording = true }
    func finishRecording() { recording = false }
}
