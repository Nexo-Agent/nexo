---
description: Workflow for automatically committing changes with conventional commit messages
---

# Commit Workflow (Auto)

This workflow is for automatically staging and committing changes using the Conventional Commits specification without requiring manual confirmation for the message.

## When to Use

Use this workflow when you have finished a task and want the agent to automatically commit the changes with a meaningful message.

## Workflow Steps

1. **Analyze Changes**
   - Run `git status` to identify modified and untracked files.
   - Run `git diff` and `git diff --cached` to understand the depth of changes.

2. **Generate Commit Message**
   - Determine the appropriate type:
     - **feat**: New feature
     - **fix**: Bug fix
     - **refactor**: Code change that neither fixes a bug nor adds a feature
     - **style**: Formatting, white-space, etc.
     - **docs**: Documentation only
     - **chore**: Build tasks, config files, etc.
     - **perf**: Performance improvement
   - Identify the scope (e.g., chat, agent, ui).
   - Write a concise description in **English** (imperative mood).

3. **Execute Commit**
   - Stage all relevant changes.
   - Run `git add .` (or specific files if only a subset is relevant)
   - Run `git commit -m "<type>(<scope>): <meaningful description>"`

4. **Verify Commit**
   - Run `git log -1` to ensure the commit was successful.

## Important Rules

- **AUTOMATIC EXECUTION**: This workflow does not require user confirmation for the commit message.
- Commit messages MUST be in **English**.
- Respond in Vietnamese with a summary of the committed changes.
