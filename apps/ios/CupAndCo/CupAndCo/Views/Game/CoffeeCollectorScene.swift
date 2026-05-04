import SpriteKit
import UIKit

// MARK: - Colour helpers (UIColor versions of CupColors)

private extension UIColor {
    /// paper: #FAF6F0
    static let cupPaper    = UIColor(red: 0.980, green: 0.965, blue: 0.941, alpha: 1)
    /// terracotta primary: #C2410C
    static let cupPrimary  = UIColor(red: 0.761, green: 0.255, blue: 0.047, alpha: 1)
    /// espresso: #1C1917
    static let cupEspresso = UIColor(red: 0.110, green: 0.098, blue: 0.090, alpha: 1)
    /// warm dark brown for bean crack
    static let cupCrack    = UIColor(red: 0.400, green: 0.150, blue: 0.020, alpha: 1)
}

// MARK: - Scene

final class CoffeeCollectorScene: SKScene {

    // MARK: - Callbacks (set before presenting)
    var onScoreChange: ((Int) -> Void)?
    var onLivesChange: ((Int) -> Void)?
    /// Called with (finalScore, elapsedSeconds) when the round ends.
    var onGameOver: ((Int, TimeInterval) -> Void)?

    // MARK: - Game constants
    private let gameDuration: TimeInterval = 60
    private let initialSpawnInterval: TimeInterval = 1.2
    private let spawnIntervalDecrement: TimeInterval = 0.015
    private let minimumSpawnInterval: TimeInterval = 0.5
    private let initialSpeedMin: CGFloat = 3
    private let initialSpeedMax: CGFloat = 5
    private let speedMultiplierIncrement: CGFloat = 0.015
    private let pointsPerCatch = 10
    private let startingLives = 3

    // MARK: - State
    private var score = 0 {
        didSet { onScoreChange?(score) }
    }
    private var lives = 3 {
        didSet { onLivesChange?(lives) }
    }
    private var spawnCount = 0
    private var currentSpawnInterval: TimeInterval = 1.2
    private var currentSpeedMultiplier: CGFloat = 1.0
    private var gameStartTime: TimeInterval = 0
    private var isGameOver = false

    // MARK: - Nodes
    private var cupNode: SKShapeNode!
    private var beans: [SKShapeNode] = []

    // MARK: - Scene lifecycle

    override func didMove(to view: SKView) {
        backgroundColor = .cupPaper
        physicsWorld.gravity = .zero

        lives = startingLives
        score = 0
        spawnCount = 0
        currentSpawnInterval = initialSpawnInterval
        currentSpeedMultiplier = 1.0
        isGameOver = false

        setupCup()
        scheduleNextSpawn()
        scheduleGameTimer()
    }

    // MARK: - Setup

    private func setupCup() {
        let cupW: CGFloat = 72
        let cupH: CGFloat = 44
        let y: CGFloat = 60

        // Simple trapezoid approximation using a rounded rect
        let path = cupPath(width: cupW, height: cupH)
        cupNode = SKShapeNode(path: path)
        cupNode.fillColor = .cupEspresso
        cupNode.strokeColor = .clear
        cupNode.position = CGPoint(x: size.width / 2, y: y)
        addChild(cupNode)
    }

    private func cupPath(width: CGFloat, height: CGFloat) -> CGPath {
        // Trapezoid: wider at top, narrower at bottom
        let topW = width
        let botW = width * 0.65
        let path = CGMutablePath()
        path.move(to: CGPoint(x: -topW / 2, y: height / 2))
        path.addLine(to: CGPoint(x: topW / 2, y: height / 2))
        path.addLine(to: CGPoint(x: botW / 2, y: -height / 2))
        path.addLine(to: CGPoint(x: -botW / 2, y: -height / 2))
        path.closeSubpath()
        return path
    }

    // MARK: - Spawning

    private func scheduleNextSpawn() {
        guard !isGameOver else { return }
        let wait = SKAction.wait(forDuration: currentSpawnInterval)
        let spawn = SKAction.run { [weak self] in
            self?.spawnBean()
        }
        run(SKAction.sequence([wait, spawn]), withKey: "spawn")
    }

    private func spawnBean() {
        guard !isGameOver else { return }
        spawnCount += 1

        // Advance difficulty
        currentSpawnInterval = max(minimumSpawnInterval,
                                   initialSpawnInterval - Double(spawnCount) * spawnIntervalDecrement)
        currentSpeedMultiplier = 1.0 + CGFloat(spawnCount) * speedMultiplierIncrement

        // Choose random x, spawn at top
        let beanW: CGFloat = 22
        let beanH: CGFloat = 30
        let margin: CGFloat = beanW
        let x = CGFloat.random(in: margin...(size.width - margin))
        let y = size.height + beanH

        let bean = makeBean(width: beanW, height: beanH)
        bean.position = CGPoint(x: x, y: y)
        bean.name = "bean"
        addChild(bean)
        beans.append(bean)

        // Schedule next spawn
        scheduleNextSpawn()
    }

    private func makeBean(width: CGFloat, height: CGFloat) -> SKShapeNode {
        // Ellipse body
        let bean = SKShapeNode(ellipseOf: CGSize(width: width, height: height))
        bean.fillColor = .cupPrimary
        bean.strokeColor = .clear

        // Crack line (vertical curve)
        let crack = SKShapeNode(path: crackPath(height: height))
        crack.strokeColor = .cupCrack
        crack.lineWidth = 1.5
        crack.fillColor = .clear
        bean.addChild(crack)

        return bean
    }

    private func crackPath(height: CGFloat) -> CGPath {
        let path = CGMutablePath()
        path.move(to: CGPoint(x: 0, y: height * 0.38))
        path.addCurve(
            to: CGPoint(x: 0, y: -height * 0.38),
            control1: CGPoint(x: 4, y: height * 0.12),
            control2: CGPoint(x: -4, y: -height * 0.12)
        )
        return path
    }

    // MARK: - Game timer

    private func scheduleGameTimer() {
        gameStartTime = 0 // will be set in first update
        let wait = SKAction.wait(forDuration: gameDuration)
        let end = SKAction.run { [weak self] in
            self?.endGame()
        }
        run(SKAction.sequence([wait, end]), withKey: "gameTimer")
    }

    // MARK: - Update loop

    private var firstUpdateTime: TimeInterval = 0

    override func update(_ currentTime: TimeInterval) {
        guard !isGameOver else { return }

        if firstUpdateTime == 0 { firstUpdateTime = currentTime }

        let speedPts = CGFloat.random(in: initialSpeedMin...initialSpeedMax) * currentSpeedMultiplier
        let cupBounds = cupFrame()

        var toRemove: [SKShapeNode] = []

        for bean in beans {
            // Move bean downward
            bean.position.y -= speedPts

            let beanBottom = bean.position.y - 15 // half ellipse height

            // Catch check: bean bottom overlaps with cup
            if beanBottom <= cupBounds.maxY && beanBottom >= cupBounds.minY - 10 {
                let beanFrame = bean.frame
                if beanFrame.intersects(cupBounds) {
                    catchBean(bean)
                    toRemove.append(bean)
                    continue
                }
            }

            // Miss check: bean has gone below screen
            if bean.position.y < -40 {
                missBean(bean)
                toRemove.append(bean)
            }
        }

        for bean in toRemove {
            bean.removeFromParent()
            beans.removeAll { $0 === bean }
        }
    }

    private func cupFrame() -> CGRect {
        // Cup is a trapezoid; use top width for collision generosity
        let topW: CGFloat = 72
        let h: CGFloat = 44
        return CGRect(
            x: cupNode.position.x - topW / 2,
            y: cupNode.position.y - h / 2,
            width: topW,
            height: h
        )
    }

    // MARK: - Catch / Miss

    private func catchBean(_ bean: SKShapeNode) {
        score += pointsPerCatch
        showFloatingText("+\(pointsPerCatch)", at: bean.position, color: .cupPrimary)
    }

    private func missBean(_ bean: SKShapeNode) {
        lives -= 1
        if lives <= 0 {
            endGame()
        }
    }

    private func showFloatingText(_ text: String, at position: CGPoint, color: UIColor) {
        let label = SKLabelNode(text: text)
        label.fontName = "SF Pro Rounded"
        label.fontSize = 20
        label.fontColor = color
        label.position = position
        label.zPosition = 10
        addChild(label)

        let moveUp = SKAction.moveBy(x: 0, y: 60, duration: 0.8)
        let fade = SKAction.fadeOut(withDuration: 0.8)
        let group = SKAction.group([moveUp, fade])
        label.run(SKAction.sequence([group, .removeFromParent()]))
    }

    // MARK: - Game over

    private func endGame() {
        guard !isGameOver else { return }
        isGameOver = true
        removeAction(forKey: "spawn")
        removeAction(forKey: "gameTimer")

        let elapsed = firstUpdateTime > 0
            ? min(gameDuration, CACurrentMediaTime() - firstUpdateTime)
            : gameDuration

        // Clean up remaining beans
        for bean in beans { bean.removeFromParent() }
        beans.removeAll()

        onGameOver?(score, elapsed)
    }

    // MARK: - Touch input

    override func touchesMoved(_ touches: Set<UITouch>, with event: UIEvent?) {
        guard !isGameOver, let touch = touches.first else { return }
        let location = touch.location(in: self)
        let halfW: CGFloat = 36
        let clampedX = max(halfW, min(size.width - halfW, location.x))
        cupNode.position.x = clampedX
    }

    override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent?) {
        touchesMoved(touches, with: event)
    }
}
