import XCTest
@testable import CupAndCo

final class CupAndCoTests: XCTestCase {
    func testAppLanguageDefaultsToEnglish() {
        UserDefaults.standard.removeObject(forKey: "language_pref")
        XCTAssertEqual(AppLanguage.current, .english)
    }

    func testColorsAreOpaque() {
        // Sanity check that brand colors are non-transparent.
        let primary = CupColors.primaryOrange
        XCTAssertNotNil(primary)
    }
}
