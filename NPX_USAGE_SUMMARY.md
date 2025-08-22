# 🚀 CCO npx Usage Summary

## ✅ npx Support Configured

CCO is now fully configured to work with `npx` for zero-installation usage!

## 📦 How to Use

### Local Development (Current Directory)
```bash
# Build first
npm run build

# Then use with npx
npx . init
npx . start --mission mission.yaml
npx . status
npx . resume
npx . --help
```

### After Publishing to npm
```bash
# Once published to npm registry
npx cco-cli init
npx cco-cli start --mission mission.yaml

# Or shorter if unique
npx cco init
```

### Directly from GitHub
```bash
# No npm publish needed
npx github:mivertowski/cco init
npx github:mivertowski/cco start --mission mission.yaml
```

## 🔧 What Was Done

1. **Updated package.json**:
   - Added `cco` as the main bin entry for cco-cli package
   - Added repository, bugs, and homepage fields
   - Specified files to include in npm package
   - Added more keywords for discoverability

2. **Fixed Module Resolution**:
   - Removed TypeScript path aliases that don't work in compiled JS
   - Updated all imports to use relative paths
   - Ensured proper module resolution for npx execution

3. **Created Documentation**:
   - Added comprehensive npx usage guide (`docs/npx-usage.md`)
   - Updated README with npx quick start
   - Created test script for local npx testing

4. **Ensured Clean Package**:
   - `.npmignore` excludes unnecessary files
   - Only distributes compiled JS, README, and LICENSE
   - Keeps package size minimal

## 📋 Publishing Checklist

When ready to publish to npm:

```bash
# 1. Ensure clean build
npm run clean
npm run build

# 2. Test locally
npx . --version
npx . --help

# 3. Update version
npm version patch  # or minor/major

# 4. Login to npm
npm login

# 5. Publish
npm publish

# 6. Test from npm
npx cco-cli@latest --version
```

## 🎯 Benefits

- **Zero Installation**: Users can run immediately with `npx`
- **Always Latest**: npx fetches the latest version by default
- **CI/CD Friendly**: Perfect for automated pipelines
- **Clean Systems**: No global package pollution
- **Version Flexibility**: Easy to test different versions

## 📝 Example Usage

```bash
# Quick test with free models
export OPENROUTER_API_KEY="your-key"
npx cco-cli init
echo 'mission:
  title: "Test"
  repository: "."
  description: "Quick test"
  definition_of_done:
    - criteria: "Works"
      priority: critical' > mission.yaml
npx cco-cli start --mission mission.yaml
```

The CCO is now ready for distribution via npx! 🎉