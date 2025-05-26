# Modern Desktop Chat UI

A modern, ChatGPT-inspired desktop chat interface built with Electron. Features a sleek dark theme, responsive design, and cross-platform compatibility.

## Features

- 🎨 Modern dark theme interface
- 💬 Multiple chat sessions
- 🚀 Fast and responsive
- 🔄 Auto-save conversations
- 📱 Responsive design
- 🖥️ Cross-platform (macOS, Windows, Linux)

## Quick Start

### Prerequisites

- Node.js 18 or higher
- npm or yarn

### Installation

1. **Download the code** from the v0 code block above
2. **Extract and navigate** to the project folder
3. **Run the setup script:**
   \`\`\`bash
   chmod +x scripts/*.sh
   ./scripts/setup-repo.sh
   \`\`\`

### Running the App

\`\`\`bash
# Install dependencies (if not done by setup script)
npm install

# Start the app
npm start
\`\`\`

### Building for Distribution

\`\`\`bash
# Build for your current platform
npm run build

# Build for specific platforms
npm run build:mac    # macOS
npm run build:win    # Windows
npm run build:linux  # Linux
\`\`\`

## Creating Releases

\`\`\`bash
# Create a new release
./scripts/release.sh v1.0.0
\`\`\`

This will automatically:
- Update the version in package.json
- Create a git tag
- Trigger GitHub Actions to build for all platforms
- Create a GitHub release with installers

## Project Structure

\`\`\`
modern-desktop-chat-ui/
├── main.js              # Electron main process
├── index.html           # Chat UI interface
├── package.json         # Project configuration
├── build/               # Build assets
│   └── entitlements.mac.plist
├── scripts/             # Utility scripts
│   ├── setup-repo.sh   # Repository setup
│   └── release.sh      # Release creation
└── .github/workflows/   # GitHub Actions
    └── build-and-release.yml
\`\`\`

## License

MIT License
