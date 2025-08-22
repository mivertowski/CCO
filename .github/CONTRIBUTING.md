# Contributing to Claude Code Orchestrator (CCO)

Thank you for your interest in contributing to CCO! We welcome contributions from the community and are grateful for any help you can provide.

## Table of Contents
- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Reporting Issues](#reporting-issues)

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please:
- Be respectful and considerate
- Welcome newcomers and help them get started
- Focus on constructive criticism
- Respect differing viewpoints and experiences

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/cco.git`
3. Add upstream remote: `git remote add upstream https://github.com/mivertowski/cco.git`
4. Create a branch: `git checkout -b feature/your-feature-name`

## How to Contribute

### Types of Contributions

- **Bug Fixes**: Found a bug? Fix it and submit a PR!
- **Features**: Have an idea? Open an issue first to discuss
- **Documentation**: Help improve our docs
- **Tests**: More test coverage is always welcome
- **Mission Templates**: Share useful mission configurations
- **Performance**: Optimize token usage or execution speed

### First Time Contributors

Look for issues labeled `good first issue` or `help wanted`. These are great starting points!

## Development Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Git

### Installation
```bash
# Clone your fork
git clone https://github.com/your-username/cco.git
cd cco

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run in development mode
npm run dev
```

### Environment Setup
Create a `.env` file:
```env
OPENROUTER_API_KEY=your_test_key
ANTHROPIC_API_KEY=your_test_key  # Optional
LOG_LEVEL=DEBUG
```

## Coding Standards

### TypeScript Guidelines
- Use TypeScript for all new code
- Enable strict mode
- Provide types for all parameters and return values
- Use interfaces over type aliases where appropriate

### Code Style
```typescript
// Good
export interface MissionConfig {
  title: string;
  repository: string;
  definitionOfDone: DoDCriteria[];
}

// Bad
export type MissionConfig = {
  title: any,
  repository: any,
  definitionOfDone: any[]
}
```

### File Structure
```
src/
├── core/           # Core orchestration logic
├── llm/            # LLM integrations
├── models/         # Data models
├── integrations/   # External integrations
├── utils/          # Utility functions
└── cli/            # CLI interface
```

### Naming Conventions
- Files: `kebab-case.ts`
- Classes: `PascalCase`
- Functions/Variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Interfaces: `IPrefixOptional`

## Testing

### Running Tests
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- orchestrator.test.ts

# Run in watch mode
npm test -- --watch
```

### Writing Tests
```typescript
describe('Orchestrator', () => {
  it('should initialize with mission', async () => {
    const orchestrator = new Orchestrator(config);
    expect(orchestrator).toBeDefined();
    expect(orchestrator.mission).toEqual(mission);
  });
});
```

### Test Coverage
- Aim for >80% coverage for new code
- Critical paths should have 100% coverage
- Include edge cases and error scenarios

## Pull Request Process

### Before Submitting

1. **Update from upstream**:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run checks**:
   ```bash
   npm run lint
   npm run typecheck
   npm test
   npm run build
   ```

3. **Update documentation** if needed

4. **Write clear commit messages**:
   ```
   feat(orchestrator): add retry logic for failed tasks
   
   - Implement exponential backoff
   - Add max retry configuration
   - Update tests for retry behavior
   
   Fixes #123
   ```

### PR Guidelines

- Keep PRs focused and small
- One feature/fix per PR
- Include tests for new functionality
- Update documentation as needed
- Link related issues
- Ensure CI passes

### Review Process

1. Submit PR with clear description
2. Address reviewer feedback
3. Ensure all checks pass
4. Maintainer merges when approved

## Reporting Issues

### Bug Reports

Include:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details
- Mission file (if applicable)
- Error logs

### Feature Requests

Include:
- Problem you're trying to solve
- Proposed solution
- Alternative solutions considered
- Use cases

## Project Structure

### Key Directories
```
.
├── src/              # Source code
├── tests/            # Test files
├── docs/             # Documentation
├── templates/        # Mission templates
├── examples/         # Example usage
└── scripts/          # Build/utility scripts
```

### Key Files
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `.env.example` - Environment variables template
- `README.md` - Project documentation

## Release Process

We follow semantic versioning (MAJOR.MINOR.PATCH):
- MAJOR: Breaking changes
- MINOR: New features (backward compatible)
- PATCH: Bug fixes

## Getting Help

- Check existing [issues](https://github.com/mivertowski/cco/issues)
- Join [discussions](https://github.com/mivertowski/cco/discussions)
- Read the [documentation](https://github.com/mivertowski/cco/tree/main/docs)
- Ask in the issue before starting major work

## Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Given credit in documentation

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to CCO! Your efforts help make automated development better for everyone. 🚀