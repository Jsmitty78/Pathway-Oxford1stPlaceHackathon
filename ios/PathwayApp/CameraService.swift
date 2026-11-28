import AVFoundation
import Vision
import CoreML
import SwiftUI

/// Portrait-only frames and aspect-fit preview keep Vision boxes aligned without crop guesses.
final class CameraService: NSObject, ObservableObject, AVCaptureVideoDataOutputSampleBufferDelegate {
    let session = AVCaptureSession()
    private let queue = DispatchQueue(label: "pathway.camera")
    private var configured = false
    private var desiredRunning = false // accessed only on queue
    private var request: VNCoreMLRequest?
    private var lastFrame = 0.0
    private var modelStatus = "No detector model installed. Camera preview only."
    var onDetections: (([Detection]) -> Void)?
    var onStatus: ((String) -> Void)?

    override init() {
        super.init()
        if let url = Bundle.main.url(forResource: "HazardDetector", withExtension: "mlmodelc") {
            do {
                let model = try VNCoreMLModel(for: MLModel(contentsOf: url))
                request = VNCoreMLRequest(model: model)
                request?.imageCropAndScaleOption = .scaleFit
                modelStatus = "Detector loaded. Image-position heuristic; no distance estimate."
            } catch { modelStatus = "Detector could not load: \(error.localizedDescription)" }
        }
    }
    private func status(_ message: String) { DispatchQueue.main.async { self.onStatus?(message) } }
    func start() {
        queue.async { self.desiredRunning = true }
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized: configureAndStart()
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { granted in
                if granted { self.configureAndStart() } else { self.status("Camera access denied. Enable it in Settings.") }
            }
        default: status("Camera access denied. Enable it in Settings.")
        }
    }
    private func configureAndStart() {
        queue.async {
            guard self.desiredRunning else { return }
            if !self.configured {
                self.session.beginConfiguration()
                self.session.sessionPreset = .hd1280x720
                guard let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back),
                      let input = try? AVCaptureDeviceInput(device: device), self.session.canAddInput(input) else {
                    self.session.commitConfiguration(); self.status("Rear camera unavailable."); return
                }
                self.session.addInput(input)
                let output = AVCaptureVideoDataOutput()
                output.alwaysDiscardsLateVideoFrames = true
                output.videoSettings = [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA]
                guard self.session.canAddOutput(output) else {
                    self.session.removeInput(input); self.session.commitConfiguration()
                    self.status("Camera output unavailable."); return
                }
                self.session.addOutput(output)
                output.setSampleBufferDelegate(self, queue: self.queue)
                // AVCapture rotates delivered buffers into portrait; Vision therefore uses .up.
                if let connection = output.connection(with: .video), connection.isVideoRotationAngleSupported(90) {
                    connection.videoRotationAngle = 90
                }
                self.session.commitConfiguration(); self.configured = true
            }
            self.session.startRunning()
            self.status(self.session.isRunning ? self.modelStatus : "Camera did not start.")
        }
    }
    func stop() {
        queue.async {
            self.desiredRunning = false
            if self.session.isRunning { self.session.stopRunning() }
        }
    }
    func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
        guard desiredRunning, let request, let buffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
        let time = CMSampleBufferGetPresentationTimeStamp(sampleBuffer).seconds
        guard time - lastFrame >= 0.2 else { return }; lastFrame = time
        do {
            try VNImageRequestHandler(cvPixelBuffer: buffer, orientation: .up).perform([request])
            guard let observations = request.results as? [VNRecognizedObjectObservation] else {
                status("Unsupported model output. Install an object detector with NMS and labels.")
                DispatchQueue.main.async { self.onDetections?([]) }; return
            }
            let detections = observations.compactMap { observation -> Detection? in
                guard let label = observation.labels.first else { return nil }
                let box = observation.boundingBox
                return Detection(label: label.identifier, confidence: Double(label.confidence), x: box.minX,
                                 y: 1 - box.maxY, width: box.width, height: box.height)
            }
            DispatchQueue.main.async { self.onDetections?(detections) }
        } catch {
            status("Detection failed: \(error.localizedDescription)")
            DispatchQueue.main.async { self.onDetections?([]) }
        }
    }
}

struct CameraPreview: UIViewRepresentable {
    let session: AVCaptureSession
    final class PreviewView: UIView {
        override class var layerClass: AnyClass { AVCaptureVideoPreviewLayer.self }
        var preview: AVCaptureVideoPreviewLayer { layer as! AVCaptureVideoPreviewLayer }
        override func layoutSubviews() {
            super.layoutSubviews()
            if let connection = preview.connection, connection.isVideoRotationAngleSupported(90) { connection.videoRotationAngle = 90 }
        }
    }
    func makeUIView(context: Context) -> PreviewView {
        let view = PreviewView(); view.preview.session = session; view.preview.videoGravity = .resizeAspect
        return view
    }
    func updateUIView(_ uiView: PreviewView, context: Context) {}
}
