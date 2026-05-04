import SwiftUI
import SpriteKit

// MARK: - Game Phase

private enum GamePhase {
    case loading
    case idle
    case playing
    case gameover
}

// MARK: - GameView

struct GameView: View {
    @Environment(SessionStore.self) private var session
    @Environment(\.dismiss) private var dismiss

    @State private var gameSession: GameSession?
    @State private var score = 0
    @State private var lives = 3
    @State private var phase: GamePhase = .loading
    @State private var finalScore = 0
    @State private var finalDuration: Double = 0
    @State private var pointsAwarded = 0
    @State private var error: String?
    @State private var timeRemaining: Int = 60
    @State private var timer: Timer?
    @State private var scene: CoffeeCollectorScene?

    var body: some View {
        ZStack {
            CupColors.paper.ignoresSafeArea()

            switch phase {
            case .loading:
                loadingView
            case .idle:
                idleView
            case .playing:
                playingView
            case .gameover:
                gameoverView
            }
        }
        .navigationTitle("")
        .navigationBarHidden(phase == .playing)
        .task { await loadSession() }
        .onDisappear { stopTimer() }
    }

    // MARK: - Loading

    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .tint(CupColors.primary)
            Text("Preparing your game…")
                .font(.system(size: 15, design: .rounded))
                .foregroundStyle(CupColors.muted)
        }
    }

    // MARK: - Idle / Start screen

    private var idleView: some View {
        VStack(spacing: 0) {
            Spacer()

            // Brand mark
            VStack(spacing: 20) {
                ZStack {
                    Circle()
                        .fill(CupColors.primaryTint)
                        .frame(width: 110, height: 110)
                    Text("☕")
                        .font(.system(size: 52))
                }

                VStack(spacing: 8) {
                    Text("Coffee Collector")
                        .font(.system(size: 28, weight: .bold, design: .rounded))
                        .foregroundStyle(CupColors.espresso)
                    Text("Catch the falling beans!\nEach catch earns +10 points.")
                        .font(.system(size: 15, design: .rounded))
                        .foregroundStyle(CupColors.muted)
                        .multilineTextAlignment(.center)
                }
            }

            Spacer()

            // Rules card
            rulesCard

            Spacer()

            // Error / limit notice
            if let error {
                Text(error)
                    .font(.system(size: 13, design: .rounded))
                    .foregroundStyle(CupColors.error)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
                    .padding(.bottom, 12)
            }

            // Play button
            Button {
                startGame()
            } label: {
                Text("Play")
                    .font(.system(size: 18, weight: .bold, design: .rounded))
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(
                        RoundedRectangle(cornerRadius: 16, style: .continuous)
                            .fill(CupColors.primary)
                    )
            }
            .buttonStyle(.plain)
            .padding(.horizontal, 32)
            .padding(.bottom, 40)
        }
        .padding(.horizontal, 24)
    }

    private var rulesCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            ruleRow(icon: "hand.tap.fill", text: "Drag or tap to move the cup")
            ruleRow(icon: "circle.fill", text: "Catch a bean → +10 points")
            ruleRow(icon: "heart.slash.fill", text: "Miss a bean → lose 1 life")
            ruleRow(icon: "timer", text: "60 seconds per round")
        }
        .padding(18)
        .background(CupColors.surface)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(CupColors.stroke, lineWidth: 1)
        )
        .padding(.horizontal, 24)
    }

    private func ruleRow(icon: String, text: String) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(CupColors.primary)
                .frame(width: 24)
            Text(text)
                .font(.system(size: 14, design: .rounded))
                .foregroundStyle(CupColors.cocoa)
        }
    }

    // MARK: - Playing

    private var playingView: some View {
        VStack(spacing: 0) {
            // HUD
            hudView
                .padding(.horizontal, 20)
                .padding(.top, 12)
                .padding(.bottom, 8)

            // SpriteKit game scene
            if let scene {
                SpriteView(scene: scene)
                    .ignoresSafeArea(edges: .bottom)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
    }

    private var hudView: some View {
        HStack(spacing: 0) {
            // Score
            VStack(alignment: .leading, spacing: 2) {
                Text("SCORE")
                    .font(.system(size: 10, weight: .semibold, design: .rounded))
                    .foregroundStyle(CupColors.muted)
                Text("\(score)")
                    .font(.system(size: 24, weight: .bold, design: .rounded))
                    .foregroundStyle(CupColors.espresso)
                    .contentTransition(.numericText())
            }

            Spacer()

            // Countdown
            VStack(spacing: 2) {
                Text("TIME")
                    .font(.system(size: 10, weight: .semibold, design: .rounded))
                    .foregroundStyle(CupColors.muted)
                Text("\(timeRemaining)s")
                    .font(.system(size: 24, weight: .bold, design: .rounded))
                    .foregroundStyle(timeRemaining <= 10 ? CupColors.error : CupColors.espresso)
                    .contentTransition(.numericText())
            }

            Spacer()

            // Lives
            VStack(alignment: .trailing, spacing: 2) {
                Text("LIVES")
                    .font(.system(size: 10, weight: .semibold, design: .rounded))
                    .foregroundStyle(CupColors.muted)
                HStack(spacing: 4) {
                    ForEach(0..<3) { i in
                        Image(systemName: "heart.fill")
                            .font(.system(size: 16))
                            .foregroundStyle(i < lives ? Color.red : CupColors.stroke)
                    }
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(CupColors.surface)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(CupColors.stroke, lineWidth: 1)
        )
    }

    // MARK: - Game over

    private var gameoverView: some View {
        ScrollView {
            VStack(spacing: 28) {
                Spacer().frame(height: 20)

                // Trophy / icon
                ZStack {
                    Circle()
                        .fill(CupColors.primaryTint)
                        .frame(width: 100, height: 100)
                    Image(systemName: finalScore > 0 ? "trophy.fill" : "xmark.circle.fill")
                        .font(.system(size: 44, weight: .semibold))
                        .foregroundStyle(CupColors.primary)
                }

                VStack(spacing: 8) {
                    Text("Game Over!")
                        .font(.system(size: 28, weight: .bold, design: .rounded))
                        .foregroundStyle(CupColors.espresso)
                    Text("You scored \(finalScore) points")
                        .font(.system(size: 17, design: .rounded))
                        .foregroundStyle(CupColors.muted)
                }

                // Points awarded card
                if pointsAwarded > 0 {
                    HStack(spacing: 12) {
                        Image(systemName: "star.fill")
                            .foregroundStyle(CupColors.star)
                        Text("+\(pointsAwarded) loyalty points earned!")
                            .font(.system(size: 15, weight: .semibold, design: .rounded))
                            .foregroundStyle(CupColors.accent)
                    }
                    .padding(16)
                    .frame(maxWidth: .infinity)
                    .background(CupColors.accentTint)
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                    .padding(.horizontal, 32)
                } else if error != nil {
                    Text(error!)
                        .font(.system(size: 13, design: .rounded))
                        .foregroundStyle(CupColors.muted)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 32)
                }

                // Buttons
                VStack(spacing: 12) {
                    Button {
                        Task { await resetAndPlay() }
                    } label: {
                        Text("Play Again")
                            .font(.system(size: 17, weight: .bold, design: .rounded))
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 15)
                            .background(
                                RoundedRectangle(cornerRadius: 14, style: .continuous)
                                    .fill(CupColors.primary)
                            )
                    }
                    .buttonStyle(.plain)

                    Button {
                        dismiss()
                    } label: {
                        Text("Back to Rewards")
                            .font(.system(size: 16, weight: .semibold, design: .rounded))
                            .foregroundStyle(CupColors.primary)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 15)
                            .background(
                                RoundedRectangle(cornerRadius: 14, style: .continuous)
                                    .fill(CupColors.primaryTint)
                            )
                    }
                    .buttonStyle(.plain)
                }
                .padding(.horizontal, 32)

                Spacer().frame(height: 20)
            }
        }
        .background(CupColors.paper.ignoresSafeArea())
    }

    // MARK: - Logic

    private func loadSession() async {
        phase = .loading
        error = nil
        do {
            gameSession = try await GameAPI.startSession()
            phase = .idle
        } catch APIError.http(403, _) {
            error = "Games are for students only"
            phase = .idle
        } catch APIError.http(429, _) {
            error = "Daily session limit reached. Come back tomorrow!"
            phase = .idle
        } catch {
            self.error = (error as? LocalizedError)?.errorDescription ?? "\(error)"
            phase = .idle
        }
    }

    private func startGame() {
        score = 0
        lives = 3
        timeRemaining = 60
        error = nil

        let newScene = CoffeeCollectorScene()
        // Present in portrait orientation; use device bounds for good sizing
        newScene.size = CGSize(width: UIScreen.main.bounds.width,
                               height: UIScreen.main.bounds.height - 120)
        newScene.scaleMode = .resizeFill

        newScene.onScoreChange = { [self] s in
            Task { @MainActor in self.score = s }
        }
        newScene.onLivesChange = { [self] l in
            Task { @MainActor in self.lives = l }
        }
        newScene.onGameOver = { [self] finalS, duration in
            Task { @MainActor in await self.handleGameOver(score: finalS, duration: duration) }
        }

        self.scene = newScene
        phase = .playing
        startTimer()
    }

    private func startTimer() {
        stopTimer()
        timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [self] _ in
            Task { @MainActor in
                if self.timeRemaining > 0 {
                    self.timeRemaining -= 1
                } else {
                    self.stopTimer()
                }
            }
        }
    }

    private func stopTimer() {
        timer?.invalidate()
        timer = nil
    }

    private func handleGameOver(score: Int, duration: TimeInterval) async {
        stopTimer()
        finalScore = score
        finalDuration = duration
        pointsAwarded = 0

        if let gs = gameSession {
            do {
                let result = try await GameAPI.submitScore(
                    sessionId: gs.id,
                    score: score,
                    durationSeconds: duration
                )
                if result.accepted {
                    pointsAwarded = result.pointsAwarded
                }
            } catch {
                self.error = "Score could not be submitted."
            }
        }

        withAnimation(.spring(response: 0.35, dampingFraction: 0.65)) {
            phase = .gameover
        }
    }

    private func resetAndPlay() async {
        scene = nil
        await loadSession()
        if phase == .idle {
            startGame()
        }
    }
}

