#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
build_dir=$(mktemp -d "${TMPDIR:-/tmp}/pathway-tests.XXXXXX")
trap 'rm -rf "$build_dir"' EXIT
swiftc -DPORTABLE_TEST_RUNNER -module-cache-path /private/tmp/pathway-clang-cache Sources/PathwayCore/PathwayCore.swift Tests/PathwayCoreTests/CoreTests.swift scripts/main.swift -o "$build_dir/core-tests"
"$build_dir/core-tests"
