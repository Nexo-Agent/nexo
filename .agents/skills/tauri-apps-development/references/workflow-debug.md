---
description: Debug complex issues when the problem is unclear
---

# Debug Workflow

This workflow is for investigating complex bugs or issues when the problem is not well-understood and requires exploration.

## When to Use

Use this workflow when:

- The bug is difficult to reproduce
- The root cause is unknown
- Limited information is available
- The issue requires investigation and analysis

## Workflow Steps

1. **Gather Information**
   - Ask clarifying questions about the issue
   - Request reproduction steps if not provided
   - Identify affected features or components

2. **Investigate Code**
   - Examine relevant source files
   - Trace execution flow
   - Look for potential problem areas
   - Check related dependencies

3. **Add Debug Logging (If Needed)**
   - Add console.log/eprintln statements to track execution
   - Log variable values at key points
   - Add temporary debug output to understand flow
   - Mark debug code clearly with comments (e.g., `// DEBUG: ...`)

   **If debug code is added, verify:**
   - Run `yarn typecheck` (for TypeScript changes)
   - Run `cd src-tauri && cargo check --no-default-features` (for Rust changes)
   - Ensure debug code doesn't break compilation
   - Confirm debug output is helpful and not excessive

4. **Analyze Findings**
   - Explain what you discovered
   - Identify potential root causes
   - Suggest areas that need more investigation

5. **Provide Recommendations**
   - Suggest next steps for investigation
   - Recommend what information to collect
   - Propose hypotheses about the issue
   - Suggest when to switch to /fix workflow if root cause is found

## Important Constraints

**ABSOLUTELY NO CODE FIXES**

- Do NOT fix the bug or modify features
- Do NOT refactor code
- ONLY add debug logging if necessary
- Focus on investigation and analysis

## Response Format

Respond in Vietnamese with:

- Analysis of the code and potential issues
- Questions to help narrow down the problem
- Debug logging suggestions if needed
- Hypotheses about root causes
- No emojis

## Important Rules

- Always respond in Vietnamese
- Source code, variable names, function names, and comments must be in English
- Be thorough in investigation
- Ask questions to gather more information
- Do NOT make assumptions without evidence
- Do NOT fix code - only investigate

## References

Review these files for understanding the codebase:

- **CODING_RULES.md**: Coding standards and patterns
- **ARCHITECTURE.md**: System architecture and data flow
- **TECH_STACK.md**: Technology stack and versions
- **PROJECT_STRUCTURE_MAP.md**: File organization
