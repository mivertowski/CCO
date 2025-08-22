# Changelog

All notable changes to Claude Code Orchestrator (CCO) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-08-22

### 🎉 Initial Release

#### Core Features
- **Orchestration Engine**: Automated management of Claude Code instances for complex task completion
- **Mission System**: YAML-based mission definitions with Definition of Done (DoD) criteria
- **Session Persistence**: State management and recovery across multiple runs
- **Multi-LLM Support**: Integration with OpenRouter for manager LLM flexibility

#### Claude Code Integration
- **SDK Support**: Official Claude Code SDK integration for automated execution
- **Subscription Mode**: Support for Claude Code subscriptions (no API key required)
- **Tool Support**: Full integration with Claude Code tool capabilities

#### GitHub Integration
- **Issue to Mission**: Convert GitHub issues to CCO missions automatically
- **Pull Request Automation**: Create PRs with semantic commits from completed missions
- **Repository Integration**: Work directly with GitHub repositories

#### Developer Experience
- **Enhanced Logging**: Structured logging with context, progress reporting, and telemetry
- **Error Handling**: Custom error system with helpful suggestions and documentation
- **Token Optimization**: Context compression and intelligent truncation to reduce costs
- **Progress Visualization**: Interactive progress bars and status reporting

#### Testing & CI/CD
- **Comprehensive Tests**: Unit, integration, and E2E test suites
- **GitHub Actions**: Automated CI/CD pipeline with multi-version Node.js testing
- **Security Scanning**: Automated security audits and vulnerability scanning

#### Documentation
- **Complete README**: Comprehensive documentation with examples
- **API Documentation**: Full TypeScript type definitions
- **GitHub Templates**: Issue and PR templates for better collaboration
- **Contributing Guide**: Guidelines for contributors

### Supported Models
- **Claude Models**: Opus 4.1, Sonnet 3.5, Haiku 3
- **OpenRouter Models**: Free and premium models including Llama, Mistral, Gemini
- **Custom Models**: Support for any OpenRouter-compatible model

### Requirements
- Node.js 18.0 or higher
- Claude Code SDK 1.0.86+
- OpenRouter API key (free tier available)

### Installation
```bash
npm install -g claude-code-orchestrator
```

### Quick Start
```bash
# Initialize CCO
cco init

# Start orchestration
cco start --mission mission.yaml
```

---

For more information, visit [GitHub Repository](https://github.com/mivertowski/cco)