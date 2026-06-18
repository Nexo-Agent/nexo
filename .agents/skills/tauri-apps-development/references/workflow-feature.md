---
description: Develop new features or modify existing features
---

# Feature Development Workflow

This workflow is for developing new features or modifying existing features in the project.

## When to Use

Use this workflow when:

- Adding a new feature to the application
- Modifying or enhancing an existing feature
- Implementing user stories or requirements
- Making significant functional changes

## Workflow Steps

1. **Understand Requirements**
   - Clarify the feature requirements
   - Ask questions if anything is unclear
   - Identify affected components and features
   - Understand user expectations and use cases
   - MUST confirm that with user

2. **Analyze Impact**
   - Review existing codebase
   - Identify files and components to modify
   - Check for dependencies and side effects
   - Consider integration points
   - Assess potential breaking changes

3. **Design Solution**
   - Explain the proposed approach in Vietnamese
   - Describe the architecture or design pattern
   - Outline the implementation plan
   - Mention any trade-offs or considerations
   - Discuss alternative approaches if relevant

4. **Get Confirmation**
   - Present the plan clearly
   - Wait for user approval before proceeding
   - Address any concerns or questions

5. **Implement Feature**
   - Follow the approved design
   - Write clean, maintainable code
   - Follow project conventions and patterns
   - Add appropriate comments in English
   - Handle edge cases and errors

6. **Update Related Code**
   - Modify related components as needed
   - Update types and interfaces
   - Ensure consistency across the codebase
   - Update exports and imports

7. **Verify Implementation (MANDATORY)**

   **For Frontend (TypeScript/React) changes:**
   - Run `yarn lint --fix` to check and auto-fix linting issues
   - Run `yarn typecheck` to verify TypeScript types
   - Check console for any runtime errors
   - Verify UI renders correctly and is responsive
   - Test all user interactions and edge cases

   **For Backend (Rust) changes:**
   - Run `cd src-tauri && cargo check --no-default-features` to verify compilation
   - Run `cd src-tauri && cargo clippy` to check for warnings
   - Test all Tauri commands thoroughly
   - Verify error handling works correctly

   **For Full-Stack features:**
   - Verify both frontend and backend as above
   - Run `yarn tauri build` (if critical) to ensure production build works
   - Test the complete user flow end-to-end
   - Verify data persistence and state management
   - Check for memory leaks or performance issues

8. **Report Results**
   - Confirm all verification steps passed
   - Report any warnings or issues found
   - Document any known limitations
   - Provide testing instructions for the user

## Response Format

Respond in Vietnamese with:

- Clear explanation of the approach
- Step-by-step implementation plan
- Code changes with proper formatting
- Rationale for design decisions
- No emojis

## Important Rules

- Always respond in Vietnamese
- Source code, variable names, function names, and comments must be in English
- Explain everything clearly before taking action
- Get confirmation for significant changes
- Follow existing code patterns and conventions
- Consider maintainability and scalability
- Handle errors and edge cases properly
- Write self-documenting code with clear naming

## Best Practices

- Use feature folders structure
- Keep components focused and reusable
- Separate business logic from UI
- Use TypeScript types properly
- Follow Redux Toolkit patterns for state management
- Implement proper error handling
- Consider performance implications
- Write accessible UI components

## References

Before implementing, review these project documentation files:

- **CODING_RULES.md**: Strict coding standards and architectural patterns
- **ARCHITECTURE.md**: System architecture and data flow
- **TECH_STACK.md**: Technology versions and library usage
- **UI_STRUCTURE.md**: UI component organization (Atomic Design)
- **PROJECT_STRUCTURE_MAP.md**: File and folder organization
