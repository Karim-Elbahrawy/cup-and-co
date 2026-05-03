import SwiftUI

/// Inline SwiftUI rendering of the brand monogram —
/// a top-down coffee cup with three teal steam strands.
///
/// The monogram is fully vector so it stays crisp at every size.
/// Use `.frame(width:height:)` to scale; everything inside scales with
/// the GeometryReader so the proportions remain correct.
struct MonogramView: View {
    var body: some View {
        GeometryReader { geo in
            let size = min(geo.size.width, geo.size.height)
            ZStack {
                Circle()
                    .fill(CupColors.paper)

                // Cup body (sunrise gradient ring)
                Circle()
                    .fill(LinearGradient(colors: CupColors.sunriseStops,
                                         startPoint: .topLeading,
                                         endPoint: .bottomTrailing))
                    .frame(width: size * 0.66, height: size * 0.66)
                    .offset(y: size * 0.06)

                // Coffee surface
                Circle()
                    .fill(CupColors.espresso)
                    .frame(width: size * 0.46, height: size * 0.46)
                    .offset(y: size * 0.06)

                // Cream highlight
                Ellipse()
                    .fill(CupColors.cream.opacity(0.55))
                    .frame(width: size * 0.34, height: size * 0.085)
                    .offset(x: -size * 0.04, y: size * 0.0)

                // Three teal steam strands above the cup
                ZStack {
                    ForEach(0..<3) { i in
                        let dx: CGFloat = CGFloat(i - 1) * size * 0.16
                        Path { p in
                            p.move(to: CGPoint(x: size * 0.5 + dx, y: 0))
                            p.addQuadCurve(
                                to: CGPoint(x: size * 0.5 + dx, y: size * 0.25),
                                control: CGPoint(x: size * 0.5 + dx + size * 0.085,
                                                 y: size * 0.125)
                            )
                        }
                        .stroke(CupColors.accent,
                                style: StrokeStyle(lineWidth: max(1.5, size * 0.04),
                                                   lineCap: .round))
                    }
                }
                .offset(y: -size * 0.32)
            }
        }
        .accessibilityHidden(true)
    }
}

#Preview {
    HStack(spacing: 24) {
        MonogramView().frame(width: 32, height: 32)
        MonogramView().frame(width: 64, height: 64)
        MonogramView().frame(width: 128, height: 128)
    }
    .padding()
    .background(CupColors.paper)
}
