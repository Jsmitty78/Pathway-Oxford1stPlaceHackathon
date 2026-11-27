import SwiftUI
import RoomPlan

struct RoomScanner: UIViewRepresentable {
    @Binding var finished: Bool
    let onResult: (Result<URL, Error>) -> Void
    func makeCoordinator() -> Coordinator { Coordinator(onResult: onResult) }
    func makeUIView(context: Context) -> RoomCaptureView {
        let view = RoomCaptureView(frame: .zero)
        view.delegate = context.coordinator
        view.captureSession.run(configuration: RoomCaptureSession.Configuration())
        return view
    }
    func updateUIView(_ view: RoomCaptureView, context: Context) {
        if finished && !context.coordinator.stopped {
            context.coordinator.stopped = true
            view.captureSession.stop()
        }
    }
    static func dismantleUIView(_ view: RoomCaptureView, coordinator: Coordinator) {
        if !coordinator.stopped { view.captureSession.stop() }
    }
    final class Coordinator: NSObject, RoomCaptureViewDelegate {
        var stopped = false
        let onResult: (Result<URL, Error>) -> Void
        init(onResult: @escaping (Result<URL, Error>) -> Void) { self.onResult = onResult }
        required init?(coder: NSCoder) { return nil }
        func encode(with coder: NSCoder) {}
        func captureView(shouldPresent roomDataForProcessing: CapturedRoomData, error: Error?) -> Bool {
            if let error { DispatchQueue.main.async { self.onResult(.failure(error)) }; return false }
            return true
        }
        func captureView(didPresent processedResult: CapturedRoom, error: Error?) {
            if let error { DispatchQueue.main.async { self.onResult(.failure(error)) }; return }
            do {
                let folder = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
                    .appendingPathComponent("Rooms")
                try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
                let url = folder.appendingPathComponent("room-\(UUID().uuidString).json")
                try JSONEncoder().encode(processedResult).write(to: url, options: .atomic)
                DispatchQueue.main.async { self.onResult(.success(url)) }
            } catch { DispatchQueue.main.async { self.onResult(.failure(error)) } }
        }
    }
}

struct RoomScanScreen: View {
    @Environment(\.dismiss) private var dismiss
    @State private var finished = false
    @State private var savedURL: URL?
    @State private var errorMessage: String?
    var body: some View {
        NavigationStack {
            VStack {
                if RoomCaptureSession.isSupported {
                    RoomScanner(finished: $finished) { result in
                        switch result {
                        case .success(let url): savedURL = url
                        case .failure(let error): errorMessage = error.localizedDescription
                        }
                    }
                    Text("Room scan is saved separately. It does not provide navigation or detect rug edges.")
                        .font(.footnote).padding()
                    if let savedURL { ShareLink("Export room JSON", item: savedURL).buttonStyle(.borderedProminent) }
                    else if !finished { Button("Finish scan") { finished = true }.buttonStyle(.borderedProminent) }
                    else { Text("Processing scan…") }
                    if let errorMessage { Text(errorMessage).foregroundStyle(.red).padding() }
                } else {
                    ContentUnavailableView("LiDAR unavailable", systemImage: "sensor", description: Text("Room scanning needs a compatible Pro device. Camera and motion modes remain available."))
                }
            }
            .navigationTitle("Room scan")
            .toolbar { Button("Done") { dismiss() } }
        }
    }
}
