// swift-tools-version: 5.9
import PackageDescription
let package = Package(name: "PathwayCore", platforms: [.iOS(.v17), .macOS(.v13)], products: [.library(name: "PathwayCore", targets: ["PathwayCore"])], targets: [.target(name: "PathwayCore"), .testTarget(name: "PathwayCoreTests", dependencies: ["PathwayCore"])])
