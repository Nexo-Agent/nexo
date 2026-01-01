# Contributing to Nexo

Thank you for your interest in contributing to Nexo! We welcome contributions from everyone. By participating in this project, you agree to abide by our code of conduct.

## 📋 How to Contribute

### 1. Reporting Bugs

- **Search First**: check the [Issues](https://github.com/magiskboy/nexo/issues) to see if the bug has already been reported.
- **Detailed Report**: Provide as much information as possible:
  - OS version
  - Nexo version
  - Steps to reproduce
  - Screenshots/Recordings

### 2. Suggesting Features

- Open a new Issue with the `enhancement` label.
- Explain **why** this feature is useful and how it should work.

### 3. Submitting Pull Requests (PRs)

1.  **Fork** the repo and create your branch from `main`.
2.  **Naming**: Use a descriptive branch name (e.g., `feature/new-sidebar`,`fix/memory-leak`).
3.  **Code Style**:
    - Ensure your code passes `yarn lint` and `yarn format`.
    - If you touch Rust code, ensure `cargo clippy` passes.
4.  **Commit Messages**: We follow the **Conventional Commits** specification.
    - `feat: add new sidebar`
    - `fix: crash on windows startup`
    - `docs: update readme`
    - `chore: bump dependencies`
5.  **Tests**: Add tests for new features if applicable.
6.  **Description**: Describe your changes in detail in the PR description. Link related issues (e.g., `Fixes #123`).

## 💻 Coding Standards

### TypeScript / React

- Use **Functional Components** with hooks.
- Use `shadcn/ui` components from `src/ui/atoms` where possible.
- Avoid `any` types.

### Rust

- Follow idiomatic Rust patterns.
- Ensure proper error handling (no `unwrap()` in production code).
- Use `async/await` for I/O operations.

## ⚠️ Important Note regarding file generation

- **Bindings**: If you modify `src-tauri/src/commands` or any Structs used in the API, you MUST run `yarn gen:bindings` to update the TypeScript types.

## License

By contributing, you agree that your contributions will be licensed under its MIT License.
