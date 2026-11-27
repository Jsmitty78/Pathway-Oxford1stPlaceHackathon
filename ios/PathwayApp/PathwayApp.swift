import SwiftUI
import MessageUI

@main
struct PathwayApp: App {
    @StateObject private var model = AppModel()
    var body: some Scene { WindowGroup { MonitorView(model: model).preferredColorScheme(.dark) } }
}

struct MonitorView: View {
    @ObservedObject var model: AppModel
    @Environment(\.scenePhase) private var phase
    @State private var showSettings = false
    @State private var showLog = false
    @State private var showScan = false
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    HStack {
                        VStack(alignment: .leading) {
                            Text("Pathway").font(.largeTitle.bold())
                            Text("Assistive mobility · Rebuilt prototype").font(.caption).foregroundStyle(.secondary)
                        }
                        Spacer()
                        Text(model.demo ? "DEMO" : "LIVE INPUT").font(.caption.bold()).padding(8)
                            .background(model.demo ? Color.orange.opacity(0.2) : Color.teal.opacity(0.2), in: Capsule())
                    }
                    GeometryReader { geometry in
                        ZStack {
                            if model.demo {
                                LinearGradient(colors: [.gray.opacity(0.4), .black], startPoint: .top, endPoint: .bottom)
                                VStack { Image(systemName: "figure.walk").font(.system(size: 70)); Text("Synthetic scene").font(.caption) }
                            } else { CameraPreview(session: model.camera.session) }
                            ForEach(model.detections.filter(\.isHazard)) { detection in
                                Rectangle().stroke(.orange, lineWidth: 3)
                                    .frame(width: geometry.size.width * detection.width, height: geometry.size.height * detection.height)
                                    .position(x: geometry.size.width * (detection.x + detection.width / 2), y: geometry.size.height * (detection.y + detection.height / 2))
                            }
                            VStack {
                                Text(model.detections.contains(where: \.isHazard) ? "Possible obstacle ahead" : (model.running ? "Observe your surroundings" : "Paused"))
                                    .font(.headline).padding(12).background(.ultraThinMaterial, in: Capsule())
                                Spacer()
                                if model.demo && model.running {
                                    Text("DEMO · Teddy bear detection").font(.caption.bold()).padding(8).background(.black.opacity(0.8), in: Capsule())
                                }
                            }.padding()
                        }
                        .clipShape(RoundedRectangle(cornerRadius: 24))
                        .accessibilityLabel(model.demo ? "Synthetic demonstration scene" : "Rear camera preview with possible obstacle boxes")
                    }.aspectRatio(9.0/16.0, contentMode: .fit)
                    Text(model.cameraStatus).font(.footnote).foregroundStyle(.secondary).frame(maxWidth: .infinity, alignment: .leading)
                    HStack {
                        Button(model.running ? "Pause" : "Start", systemImage: model.running ? "pause.fill" : "play.fill") {
                            if model.running { model.pause() } else { model.start() }
                        }.buttonStyle(.borderedProminent).tint(.teal)
                        Button("HELP", systemImage: "hand.raised.fill") { model.beginHelp(reason: "User pressed HELP") }
                            .buttonStyle(.borderedProminent).tint(.red)
                        Button("Log", systemImage: "list.bullet.rectangle") { showLog = true }.buttonStyle(.bordered)
                    }.controlSize(.large)
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Motion signal \(Int(model.score * 100)) / 100").font(.headline)
                        ProgressView(value: model.score).tint(.orange)
                        Text(model.motionStatus).font(.caption).foregroundStyle(.secondary)
                    }.padding().background(.white.opacity(0.06), in: RoundedRectangle(cornerRadius: 16))
                    Text("Research prototype. Does not establish a safe route or confirm a fall.").font(.caption).foregroundStyle(.secondary)
                }.padding()
            }
            .background(Color(red: 0.035, green: 0.055, blue: 0.065))
            .toolbar {
                Button("Room scan", systemImage: "viewfinder") { model.pause(); showScan = true }
                Button("Settings", systemImage: "gearshape") { showSettings = true }
            }
            .sheet(isPresented: $showSettings) { SettingsScreen(model: model) }
            .sheet(isPresented: $showLog) { IncidentScreen(model: model) }
            .sheet(isPresented: $showScan) { RoomScanScreen() }
            .fullScreenCover(isPresented: $model.showHelp) { HelpScreen(model: model) }
            .onChange(of: phase) { _, phase in if phase != .active { model.pause() } }
        }
    }
}

struct SettingsScreen: View {
    @ObservedObject var model: AppModel
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        NavigationStack {
            Form {
                Section("Input") {
                    Toggle("Demo mode", isOn: $model.demo).onChange(of: model.demo) { _, _ in model.changeMode() }
                    Text("Switch demo off, close Settings, then tap Start for camera and motion input.").font(.caption)
                    TextField("Room label", text: $model.room)
                    Toggle("Spoken prompts", isOn: $model.voice)
                }
                Section("Caregiver contact") {
                    TextField("Phone number with country code", text: $model.caregiver).keyboardType(.phonePad)
                        .onChange(of: model.caregiver) { _, value in UserDefaults.standard.set(value, forKey: "caregiver") }
                    Text("Stored on this device. Messages open for review; calls require a tap. Demo mode never opens contact tools.").font(.caption)
                }
                Section("Record a motion trace") {
                    Button(model.recording ? "Finish and export" : "Record up to 60 seconds") {
                        if model.recording { model.finishTrace() } else { model.beginTrace() }
                    }.disabled(!model.running || model.demo)
                    Text("Records acceleration magnitude, rotation, pitch and roll. No camera frames or audio. Use ordinary handling; do not stage a fall.").font(.caption)
                    if let url = model.exportURL { ShareLink("Share exported data", item: url) }
                }
                Section("Build provenance") {
                    Text("New Swift implementation, November 2026. Based on surviving Pathway documentation and hazard rule. Not the lost hackathon source.")
                    Text("No detector weights are bundled. See ios/docs/MODEL.md to add HazardDetector.mlpackage.")
                }
                if let error = model.storageError { Section("Storage") { Text(error).foregroundStyle(.orange) } }
            }.navigationTitle("Settings").toolbar { Button("Done") { dismiss() } }
        }
    }
}

struct IncidentScreen: View {
    @ObservedObject var model: AppModel
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        NavigationStack {
            List {
                if model.incidents.isEmpty { Text("No incidents recorded.").foregroundStyle(.secondary) }
                ForEach(model.incidents.reversed()) { incident in
                    VStack(alignment: .leading, spacing: 6) {
                        HStack { Text(incident.kind).font(.headline); Spacer(); if incident.isDemo { Text("DEMO").font(.caption).foregroundStyle(.orange) } }
                        Text(incident.detail)
                        Text("\(incident.room) · \(incident.date.formatted())").font(.caption).foregroundStyle(.secondary)
                    }.padding(.vertical, 6)
                }
                if let error = model.storageError { Text(error).foregroundStyle(.orange) }
                Button("Prepare log export") { model.exportIncidents() }
                if let url = model.exportURL { ShareLink("Share JSON", item: url) }
            }.navigationTitle("Incident log").toolbar { Button("Done") { dismiss() } }
        }
    }
}

struct HelpScreen: View {
    @ObservedObject var model: AppModel
    @Environment(\.openURL) private var openURL
    @State private var composer = false
    private let timer = Timer.publish(every: 1, on: .main, in: .common).autoconnect()
    var body: some View {
        VStack(spacing: 24) {
            Spacer()
            Image(systemName: "hand.raised.fill").font(.system(size: 70)).foregroundStyle(.orange)
            Text("Do you need help?").font(.largeTitle.bold()).multilineTextAlignment(.center)
            if case .countdown = model.help.state {
                Text("Contact options in \(model.help.remaining(now: Date())) seconds").font(.title3)
            } else {
                Text("Choose an action. No one has been contacted.").multilineTextAlignment(.center)
                if model.demo {
                    Text("Demo complete — contact actions are disabled.").foregroundStyle(.orange)
                } else if !model.contactConfigured {
                    Text("Add a caregiver phone number in Settings.")
                } else {
                    Button("Review text to caregiver") { composer = true }
                        .disabled(!MFMessageComposeViewController.canSendText())
                        .buttonStyle(.borderedProminent)
                    if !MFMessageComposeViewController.canSendText() { Text("Messaging unavailable on this device.").font(.caption) }
                    Button("Call caregiver") {
                        guard let url = URL(string: "tel:\(model.phone)") else { return }
                        openURL(url) { accepted in
                            model.log("Call handoff", accepted ? "Phone app opened; call completion is unknown." : "Could not open Phone app.")
                        }
                    }.buttonStyle(.bordered)
                }
            }
            Button("I’m okay — cancel") { model.cancelHelp() }.buttonStyle(.borderedProminent).tint(.teal).controlSize(.large)
            Text("This prototype does not contact emergency services automatically.").font(.caption).foregroundStyle(.secondary).multilineTextAlignment(.center)
            Spacer()
        }.padding(28)
            .onReceive(timer) { _ in model.tickHelp() }
            .sheet(isPresented: $composer) {
                ContactComposer(recipient: model.phone, bodyText: "Pathway: I may need help. Please contact me. Room label: \(model.room). This is a user-reviewed prototype message.") { result in
                    composer = false
                    switch result {
                    case .sent: model.log("Message submitted", "Message composer reported sent; delivery is not verified.")
                    case .cancelled: model.log("Message cancelled", "User cancelled the message.")
                    case .failed: model.log("Message failed", "Message composer reported failure.")
                    @unknown default: model.log("Message result", "Unknown result.")
                    }
                }
            }
    }
}
