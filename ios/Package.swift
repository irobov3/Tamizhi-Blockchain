// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "Tamizhi",
    platforms: [
        .iOS(.v16)
    ],
    products: [
        .library(
            name: "Tamizhi",
            targets: ["Tamizhi"]
        )
    ],
    dependencies: [],
    targets: [
        .target(
            name: "Tamizhi",
            path: "Tamizhi",
            exclude: [
                "Supporting Files/Info.plist",
                "Resources/Assets.xcassets"
            ],
            resources: [
                .process("Resources/Fonts")
            ]
        )
    ]
)
