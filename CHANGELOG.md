# Changelog

All notable changes to Claude Code Orchestrator (CCO) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.3] - 2025-08-22

### Added
- 🎉 **Claude Code as Orchestrator LLM**: Use Claude Code itself as the orchestrator with automatic permission bypass
- 🚀 **Interactive GitHub Issue Selection**: Browse and select issues with priority indicators (p0-critical, p1-high, p2-medium, p3-low)
- 🔄 **Automated Issue Processing**: Continuously process issues by priority with configurable polling intervals
- 🖥️ **Local LLM Support**: Run models locally with CUDA/CPU acceleration
  - Ollama integration for easy local model management
  - llama.cpp support for optimized inference
  - VLLM for high-performance serving
  - HuggingFace Transformers models
- 🔒 **Corporate Proxy Support**: Works behind Zscaler and other corporate proxies with SSL bypass
- 📊 **Token Optimization**: 50-80% reduction in API token usage through intelligent context management
- 🎯 **Default Model Update**: Now uses Claude Opus 4.1 (claude-opus-4-1-20250805) by default
- 📝 **Comprehensive API Documentation**: Full API reference with TypeScript examples
- 🔌 **LLM Provider Abstraction**: Unified ILLMClient interface supporting 7+ providers

### Changed
- Enhanced GitHub integration with real-time progress comments on issues
- Improved PR creation with "Fixes #X" for automatic issue closing
- Better error recovery with exponential backoff strategies
- Unified configuration management with environment variable support
- Streamlined CLI interface with better user experience

### Fixed
- Git remote URL parsing for HTTPS repositories with .git suffix
- Environment variable loading in npm scripts with dotenv
- Claude Code permission prompts in automated mode (now uses bypassPermissions)
- SSL certificate validation issues in corporate environments

## [1.0.2] - 2025-08-21

### Added
- GitHub issue to mission conversion
- Interactive CLI mode for repository management
- Priority-based issue sorting and processing
- Real-time progress visualization with progress bars
- Session checkpoint and resume functionality

### Changed
- Improved orchestration workflow with better state management
- Enhanced logging with structured output
- Better error handling and recovery mechanisms

## [1.0.1] - 2025-08-20

### Added
- Basic orchestration framework
- OpenRouter integration for LLM flexibility
- Mission and Definition of Done management
- File-based persistence for sessions

## [1.0.0] - 2025-08-19

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
npm install -g cco-cli
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