---
description: Refactor code to improve structure, maintainability, or performance without changing functionality
---

# Refactor Workflow

This workflow is for improving code structure, organization, and quality without changing the application's functionality or behavior.

## When to Use

Use this workflow when:

- Code needs better organization or structure
- Improving code maintainability or readability
- Reducing code duplication
- Applying design patterns or best practices
- Optimizing performance without changing behavior
- Migrating to new patterns or architectures
- Consolidating similar code into reusable components

## Important Principle

**Refactoring MUST NOT change functionality**

- External behavior stays exactly the same
- All existing features continue to work
- No new features are added
- No bugs are fixed (unless blocking the refactor)

## Workflow Steps

1. **Understand Current State**
   - Analyze the code to be refactored
   - Identify the current structure and patterns
   - Document current behavior and dependencies
   - List all files and components affected

2. **Define Refactoring Goal**
   - Clearly state what will be improved
   - Explain the benefits of the refactoring
   - Identify potential risks or breaking changes
   - Estimate scope and complexity

3. **Plan Refactoring Strategy**
   - Break down into smaller, safe steps
   - Identify intermediate states
   - Plan verification points
   - Consider rollback strategy if needed

4. **Get Approval**
   - Present the refactoring plan in Vietnamese
   - Explain the approach and benefits
   - Highlight any risks or considerations
   - Wait for user confirmation before proceeding

5. **Execute Refactoring**

   **Follow these principles:**
   - Make small, incremental changes
   - Keep the code working at each step
   - Follow project conventions (CODING_RULES.md)
   - Maintain consistent naming and patterns
   - Update imports and exports as needed
   - Preserve existing comments and documentation

   **Common refactoring patterns:**
   - Extract functions or components
   - Move code to appropriate locations (feature folders)
   - Rename for clarity
   - Consolidate duplicate code
   - Simplify complex logic
   - Improve type definitions

6. **Update Related Code**
   - Update all imports and references
   - Ensure type consistency
   - Update tests if they exist
   - Maintain backward compatibility where needed

7. **Verify Refactoring (MANDATORY)**

   **For Frontend (TypeScript/React) changes:**
   - Run `yarn lint --fix` to check and auto-fix linting issues
   - Run `yarn typecheck` to verify TypeScript types
   - Check console for any runtime errors
   - Verify UI renders correctly
   - Test all affected features manually
   - Ensure no functionality has changed

   **For Backend (Rust) changes:**
   - Run `cd src-tauri && cargo check --no-default-features` to verify compilation
   - Run `cd src-tauri && cargo clippy` to check for warnings
   - Run `cd src-tauri && cargo test` if tests exist
   - Test all affected Tauri commands
   - Verify behavior is identical to before

   **For Full-Stack refactoring:**
   - Verify both frontend and backend as above
   - Test the complete integration
   - Verify data flow is unchanged
   - Check for performance regressions

8. **Document Changes**
   - Explain what was refactored and why
   - Document any new patterns introduced
   - Note any follow-up refactoring opportunities
   - Update relevant documentation if needed

## Response Format

Respond in Vietnamese with:

- Clear explanation of the refactoring goal
- Step-by-step refactoring plan
- Code changes with proper formatting
- Verification results
- Summary of improvements
- No emojis

## Important Rules

- Always respond in Vietnamese
- Source code, variable names, function names, and comments must be in English
- MUST NOT change functionality or behavior
- Make incremental, safe changes
- Verify after each major step
- Follow CODING_RULES.md and architectural patterns
- Keep the codebase working at all times
- Get approval before major structural changes

## Common Refactoring Scenarios

### 1. Feature Folder Migration

- Move UI components to feature folders
- Extract business logic into hooks
- Organize state management by feature
- Follow Redux Style Guide patterns

### 2. Component Extraction

- Extract reusable components
- Separate presentation from logic
- Create custom hooks for shared logic
- Follow Atomic Design principles

### 3. Type Improvements

- Add proper TypeScript types
- Remove `any` types
- Create shared type definitions
- Improve type safety

### 4. Performance Optimization

- Memoize expensive calculations
- Optimize re-renders with React.memo
- Improve bundle size
- Optimize database queries

### 5. Code Consolidation

- Merge duplicate code
- Create utility functions
- Standardize patterns
- Remove dead code

## Verification Checklist

Before completing refactoring, ensure:

- [ ] All TypeScript/Rust compilation passes
- [ ] Linting passes without errors
- [ ] All affected features work identically
- [ ] No new bugs introduced
- [ ] Performance is same or better
- [ ] Code is more maintainable
- [ ] Documentation is updated if needed

## References

Review these files before refactoring:

- **coding.md**: Strict coding standards and patterns
- **TECH_STACK.md**: Technology stack and versions
- **UI_STRUCTURE.md**: UI component organization
- **PROJECT_STRUCTURE_MAP.md**: File organization
- **Redux Style Guide**: Feature folder structure patterns
