---
description: Create and push a new release tag (alpha, beta, rc, patch, minor, major)
---

Follow these steps to release a new version of the app:

1. **Decide on the new version**
   - **Patch**: `v0.1.0` -> `v0.1.1` (bug fixes)
   - **Minor**: `v0.1.0` -> `v0.2.0` (new features, no breaking changes)
   - **Major**: `v0.1.0` -> `v1.0.0` (breaking changes)
   - **Alpha/Beta/RC**: `v0.1.0-alpha.1`, `v0.1.0-beta.2`, etc.

2. **Update version in all project files**
   Ensure all files are in sync:
   - `src-tauri/Cargo.toml` (`[package] version = "..."`)
   - `package.json` (`"version": "..."`)
   - `src-tauri/tauri.conf.json` (`"version": "..."`)
   - `src-tauri/tauri.conf.json` (`bundle.windows.wix.version = "..."`) - **Windows MSI only**

   **IMPORTANT**: Windows MSI requires a numeric-only version. Use this mapping:
   | Release Version | Windows MSI Version |
   |----------------|---------------------|
   | `0.1.0-alpha.X` | `0.1.X` |
   | `0.1.0-beta.X` | `0.1.10X` |
   | `0.1.0-rc.X` | `0.1.20X` |
   | `0.1.0` (stable) | `0.1.0` |

   Example: `0.1.0-alpha.8` → MSI version: `0.1.8`

3. **Update Cargo.lock**
   Run the following command in `src-tauri` to sync the version in `Cargo.lock`:
   `cd src-tauri && cargo check`

4. **Update Release Note in the release CI workflow**
   Summarize the changes into a human-readable format and update the release-notes field (e.g. `releaseBody`) in your release CI workflow (e.g. `.github/workflows/*.yaml`).

   **IMPORTANT**: Only include user-facing changes:
   - ✅ New features
   - ✅ Bug fixes
   - ✅ UI/UX improvements
   - ✅ Performance improvements (if noticeable to users)
   - ✅ Breaking changes
   - ❌ Code refactoring
   - ❌ Unit tests
   - ❌ Internal code cleanup
   - ❌ Developer tooling changes

   **Markdown Format Guidelines**:
   - Keep formatting clean and simple
   - Use standard markdown: headers (`##`), lists (`-`), and code blocks (`` ` ``)
   - Avoid excessive use of emojis (maximum 1-2 per section if needed)
   - Don't mix multiple markdown styles (bold + italic + emoji)
   - Use consistent list format throughout
   - Example of good format:

     ```markdown
     ## What's New

     - Added feature X
     - Fixed bug Y

     ## Breaking Changes

     - Changed API Z
     ```

5. **Commit changes**
   `git add src-tauri/Cargo.toml src-tauri/Cargo.lock package.json src-tauri/tauri.conf.json .github/workflows/build.yaml`
   `git commit -m "chore(release): <version>"`

6. **Create Git tag**
   `git tag <version>`

7. **Push commit and tag**
   `git push origin main`
   `git push origin <version>`

Note: Replace `<version>` with the actual version string (e.g., `0.1.0-beta.1`).
