import SwiftUI
import AVFoundation

final class AppModel: ObservableObject {
    @Published var demo = true
    @Published var running = false
    @Published var detections: [Detection] = []
    @Published var cameraStatus = "Demo mode — synthetic detections."
    @Published var motionStatus = "Motion paused."
    @Published var score = 0.0
    @Published var incidents: [Incident] = []
    @Published var storageError: String?
    @Published var help = HelpFlow()
    @Published var showHelp = false
    @Published var recording = false
    @Published var exportURL: URL?
    @Published var room = "Living room"
    @Published var caregiver = UserDefaults.standard.string(forKey: "caregiver") ?? ""
    @Published var voice = false
    let camera = CameraService()
    let motion = MotionService()
    private let speech = AVSpeechSynthesizer()
    private var lastHazard = Date.distantPast
    private var lastHelp = Date.distantPast
    private var canSave = true
    private let fileURL: URL

    init() {
        let folder = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        fileURL = folder.appendingPathComponent("incidents.json")
        do { incidents = try IncidentFile.load(from: fileURL) }
        catch { storageError = "Could not read incident log. Existing file preserved: \(error.localizedDescription)"; canSave = false }
        camera.onStatus = { [weak self] in self?.cameraStatus = $0 }
        camera.onDetections = { [weak self] values in
            guard let self, self.running, !self.demo else { return }
            self.detections = values
            if let hazard = values.first(where: \.isHazard), Date().timeIntervalSince(self.lastHazard) > 10 {
                self.lastHazard = Date()
                self.log("Possible obstacle", hazard.label)
                self.speak("Possible obstacle ahead. Please check your surroundings.")
            }
        }
        motion.onStatus = { [weak self] in self?.motionStatus = $0 }
        motion.onUpdate = { [weak self] value in
            guard let self, self.running, !self.demo else { return }
            self.score = value
            if value >= 0.8 && !self.showHelp && Date().timeIntervalSince(self.lastHelp) > 30 {
                self.beginHelp(reason: "Experimental motion threshold exceeded")
            }
        }
        motion.onRecordingFinished = { [weak self] in self?.finishTrace() }
    }
    func start() {
        running = true
        if demo {
            cameraStatus = "Demo mode — synthetic detections."
            motionStatus = "Demo mode — motion sensor off."
            detections = [Detection(label: "teddy bear", confidence: 0.92, x: 0.34, y: 0.59, width: 0.29, height: 0.29)]
        } else { detections = []; camera.start(); motion.start() }
    }
    func pause() {
        running = false; camera.stop(); motion.stop(); detections = []; score = 0
        if recording { finishTrace() }
        motionStatus = "Motion paused."
        speech.stopSpeaking(at: .immediate)
    }
    func changeMode() { pause(); cameraStatus = demo ? "Demo mode — synthetic detections." : "Camera paused. Tap Start." }
    func beginHelp(reason: String) {
        guard !showHelp else { return }
        lastHelp = Date(); help.reset(); help.begin(now: Date()); showHelp = true
        log("Help requested", reason)
        speak("Do you need help? You can cancel this prompt.")
    }
    func cancelHelp() {
        help.cancel(); showHelp = false; lastHelp = Date()
        log("Help cancelled", "User dismissed the help prompt; no contact made.")
    }
    func tickHelp() { help.tick(now: Date()) }
    func log(_ kind: String, _ detail: String) {
        incidents.append(Incident(kind: kind, detail: detail, room: room, isDemo: demo))
        if incidents.count > 500 { incidents.removeFirst(incidents.count - 500) }
        guard canSave else { return }
        do { try IncidentFile.save(incidents, to: fileURL) }
        catch { storageError = "Incident could not be saved: \(error.localizedDescription)" }
    }
    func speak(_ words: String) {
        guard voice else { return }
        speech.speak(AVSpeechUtterance(string: words))
    }
    func beginTrace() {
        guard running && !demo else { return }
        motion.beginRecording(); recording = true
    }
    func finishTrace() {
        motion.finishRecording(); recording = false
        do {
            let url = FileManager.default.temporaryDirectory.appendingPathComponent("pathway-motion-\(UUID().uuidString).json")
            try JSONEncoder().encode(motion.trace).write(to: url, options: .atomic)
            exportURL = url
        } catch { storageError = "Trace export failed: \(error.localizedDescription)" }
    }
    func exportIncidents() {
        do {
            let url = FileManager.default.temporaryDirectory.appendingPathComponent("pathway-incidents.json")
            try JSONEncoder().encode(incidents).write(to: url, options: .atomic); exportURL = url
        } catch { storageError = "Log export failed: \(error.localizedDescription)" }
    }
    var phone: String { caregiver.filter { $0.isNumber || $0 == "+" } }
    var contactConfigured: Bool {
        let digits = phone.filter(\.isNumber)
        return digits.count >= 7 && digits.count <= 15 && (phone.filter { $0 == "+" }.count <= 1) && (!phone.contains("+") || phone.hasPrefix("+"))
    }
}
