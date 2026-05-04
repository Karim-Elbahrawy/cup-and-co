import SwiftUI
import AVFoundation

struct QRScannerView: View {
    let onCodeScanned: (String) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var cameraPermission: AVAuthorizationStatus = .notDetermined
    @State private var scannedCode: String?

    var body: some View {
        NavigationStack {
            ZStack {
                CupColors.espresso.ignoresSafeArea()

                switch cameraPermission {
                case .authorized:
                    CameraScannerRepresentable { code in
                        guard scannedCode == nil else { return }
                        scannedCode = code
                        let generator = UINotificationFeedbackGenerator()
                        generator.notificationOccurred(.success)
                        onCodeScanned(code)
                    }
                    .ignoresSafeArea()
                    scanOverlay
                case .denied, .restricted:
                    permissionDeniedView
                default:
                    ProgressView()
                        .tint(.white)
                }
            }
            .navigationTitle("qr.title")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("qr.close") { dismiss() }
                        .foregroundStyle(.white)
                }
            }
            .task {
                cameraPermission = AVCaptureDevice.authorizationStatus(for: .video)
                if cameraPermission == .notDetermined {
                    let granted = await AVCaptureDevice.requestAccess(for: .video)
                    cameraPermission = granted ? .authorized : .denied
                }
            }
        }
    }

    private var scanOverlay: some View {
        VStack(spacing: 0) {
            Spacer()
            ZStack {
                RoundedRectangle(cornerRadius: 20, style: .continuous)
                    .stroke(CupColors.primary, lineWidth: 3)
                    .frame(width: 240, height: 240)
                    .shadow(color: CupColors.primary.opacity(0.4), radius: 12)

                if scannedCode != nil {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 56))
                        .foregroundStyle(CupColors.accent)
                        .transition(.scale.combined(with: .opacity))
                }
            }
            .animation(.spring(response: 0.35, dampingFraction: 0.7), value: scannedCode)

            Spacer()

            Text(scannedCode != nil ? "qr.scanned" : "qr.point_camera")
                .font(.system(size: 15, weight: .medium, design: .rounded))
                .foregroundStyle(.white.opacity(0.85))
                .padding(.bottom, 40)
        }
    }

    private var permissionDeniedView: some View {
        VStack(spacing: 16) {
            Image(systemName: "camera.fill")
                .font(.system(size: 40))
                .foregroundStyle(CupColors.primary)
            Text("qr.camera_required")
                .font(.system(size: 18, weight: .bold, design: .rounded))
                .foregroundStyle(.white)
            Text("qr.camera_subtitle")
                .font(.system(size: 14, design: .rounded))
                .foregroundStyle(.white.opacity(0.7))
                .multilineTextAlignment(.center)
            Button("qr.open_settings") {
                if let url = URL(string: UIApplication.openSettingsURLString) {
                    UIApplication.shared.open(url)
                }
            }
            .font(.system(size: 15, weight: .semibold, design: .rounded))
            .foregroundStyle(.white)
            .padding(.horizontal, 24)
            .padding(.vertical, 12)
            .background(CupColors.primary)
            .clipShape(Capsule())
        }
        .padding(32)
    }
}

// MARK: - Camera Scanner UIKit Bridge

private struct CameraScannerRepresentable: UIViewControllerRepresentable {
    let onCode: (String) -> Void

    func makeUIViewController(context: Context) -> CameraScannerVC {
        CameraScannerVC(onCode: onCode)
    }

    func updateUIViewController(_ uiViewController: CameraScannerVC, context: Context) {}
}

private final class CameraScannerVC: UIViewController, AVCaptureMetadataOutputObjectsDelegate {
    private let session = AVCaptureSession()
    private let onCode: (String) -> Void
    private var hasScanned = false

    init(onCode: @escaping (String) -> Void) {
        self.onCode = onCode
        super.init(nibName: nil, bundle: nil)
    }

    @available(*, unavailable) required init?(coder: NSCoder) { fatalError() }

    override func viewDidLoad() {
        super.viewDidLoad()

        guard let device = AVCaptureDevice.default(for: .video),
              let input = try? AVCaptureDeviceInput(device: device) else { return }

        if session.canAddInput(input) { session.addInput(input) }

        let output = AVCaptureMetadataOutput()
        if session.canAddOutput(output) {
            session.addOutput(output)
            output.setMetadataObjectsDelegate(self, queue: .main)
            output.metadataObjectTypes = [.qr]
        }

        let preview = AVCaptureVideoPreviewLayer(session: session)
        preview.videoGravity = .resizeAspectFill
        preview.frame = view.bounds
        view.layer.addSublayer(preview)

        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            self?.session.startRunning()
        }
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        if let layer = view.layer.sublayers?.first(where: { $0 is AVCaptureVideoPreviewLayer }) {
            layer.frame = view.bounds
        }
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        session.stopRunning()
    }

    func metadataOutput(
        _ output: AVCaptureMetadataOutput,
        didOutput metadataObjects: [AVMetadataObject],
        from connection: AVCaptureConnection
    ) {
        guard !hasScanned,
              let object = metadataObjects.first as? AVMetadataMachineReadableCodeObject,
              let value = object.stringValue else { return }
        hasScanned = true
        session.stopRunning()
        onCode(value)
    }
}
