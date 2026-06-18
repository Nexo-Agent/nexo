---
description: Fix a bug or issue when everything is clear
---

# Bug Fix Workflow

This workflow is for fixing bugs or issues when the problem is well-understood and clearly defined.

## Prerequisites

The developer must provide:

1. **Current State**: Detailed description of the current behavior
2. **UI State**: Screenshots or description of how the UI looks/behaves
3. **Related Feature**: Which feature or component is affected
4. **Expected Behavior**: What the user expects to happen
5. **Steps to Reproduce**: Clear steps to reproduce the issue (if applicable)

## Workflow Steps

1. **Understand the Problem**
   - Review the provided information carefully
   - Identify the root cause based on the description
   - Locate the relevant code files and functions

2. **Analyze the Code**
   - Examine the related source code
   - Identify the specific lines or logic causing the issue
   - Check for related dependencies or side effects

3. **Propose Solution**
   - Explain the root cause in Vietnamese
   - Describe the fix approach clearly
   - Mention any potential side effects or considerations

4. **Implement Fix**
   - Make the necessary code changes
   - Ensure code follows project conventions (see CODING_RULES.md)
   - Add comments in English where needed
   - Follow architectural patterns (Commands → Services → Repositories for Rust)

5. **Verify Fix (MANDATORY)**

   **For Frontend (TypeScript/React) changes:**
   - Run `yarn lint --fix` to check and auto-fix linting issues
   - Run `yarn typecheck` to verify TypeScript types
   - Check console for any runtime errors
   - Verify UI renders correctly

   **For Backend (Rust) changes:**
   - Run `cd src-tauri && cargo check --no-default-features` to verify compilation
   - Run `cd src-tauri && cargo clippy` to check for warnings
   - Test the Tauri command if applicable

   **For Full-Stack changes:**
   - Verify both frontend and backend as above
   - Run `yarn tauri build` (if critical) to ensure production build works
   - Test the integration between frontend and backend

6. **Report Results**
   - Confirm all verification steps passed
   - Report any remaining issues or warnings
   - Suggest manual testing steps if needed

## Response Format

Respond in Vietnamese with:

- Clear explanation of the issue
- Step-by-step fix description
- Code changes with proper formatting
- Verification results
- No emojis

## Important Rules

- Always respond in Vietnamese
- Source code, variable names, function names, and comments must be in English
- Be direct and goal-oriented
- Fix the issue without unnecessary refactoring
- Maintain existing code style and patterns
- MUST verify all changes with lint, typecheck, and build
- Follow CODING_RULES.md and ARCHITECTURE.md strictly

## References

Review these files for context:

- **CODING_RULES.md**: Coding standards and patterns
- **ARCHITECTURE.md**: System architecture
- **TECH_STACK.md**: Technology stack and versions
