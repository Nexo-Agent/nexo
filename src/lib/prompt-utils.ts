/**
 * Utility functions for parsing and rendering prompts with variables
 */

/**
 * Extract unique variable names from prompt content
 * Variables are in the format {{variable_name}}
 *
 * @param content - The prompt content to parse
 * @returns Array of unique variable names
 */
export function parsePromptVariables(content: string): string[] {
  const regex = /\{\{(\w+)\}\}/g;
  const matches = [...content.matchAll(regex)];
  const variables = matches.map((match) => match[1]);
  return [...new Set(variables)]; // Remove duplicates
}

/**
 * Render prompt by replacing variables with values
 *
 * @param content - The prompt content with variables
 * @param variables - Object mapping variable names to their values
 * @returns Rendered prompt content with variables replaced
 */
export function renderPrompt(
  content: string,
  variables: Record<string, string>
): string {
  let rendered = content;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    rendered = rendered.replace(regex, value);
  }
  return rendered;
}
