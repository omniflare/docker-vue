#!/bin/bash

# Cleanup old builds
rm -rf src-tauri/target/release

# Build frontend
npm run build

# Build for your specific platform only (saves resources)
cd src-tauri
cargo tauri build

echo "Build completed! Check src-tauri/target/release/"