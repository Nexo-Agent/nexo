import { describe, it, expect } from 'vitest';
import { parsePromptVariables, renderPrompt } from './prompt-utils';

describe('prompt-utils', () => {
  describe('parsePromptVariables', () => {
    it('should extract single variable', () => {
      const content = 'Hello {{name}}!';
      const variables = parsePromptVariables(content);

      expect(variables).toEqual(['name']);
    });

    it('should extract multiple variables', () => {
      const content =
        'Hello {{name}}, you are {{age}} years old from {{city}}.';
      const variables = parsePromptVariables(content);

      expect(variables).toEqual(['name', 'age', 'city']);
    });

    it('should remove duplicate variables', () => {
      const content = 'Hello {{name}}, {{name}} is a great name!';
      const variables = parsePromptVariables(content);

      expect(variables).toEqual(['name']);
    });

    it('should handle variables with underscores', () => {
      const content = 'User: {{user_name}}, Email: {{user_email}}';
      const variables = parsePromptVariables(content);

      expect(variables).toEqual(['user_name', 'user_email']);
    });

    it('should handle variables with numbers', () => {
      const content = '{{var1}} and {{var2}} and {{var123}}';
      const variables = parsePromptVariables(content);

      expect(variables).toEqual(['var1', 'var2', 'var123']);
    });

    it('should return empty array for no variables', () => {
      const content = 'This is a plain text without variables.';
      const variables = parsePromptVariables(content);

      expect(variables).toEqual([]);
    });

    it('should return empty array for empty string', () => {
      const variables = parsePromptVariables('');
      expect(variables).toEqual([]);
    });

    it('should ignore malformed variables', () => {
      const content = 'Valid: {{name}}, Invalid: {name}, {{name, {{}}';
      const variables = parsePromptVariables(content);

      expect(variables).toEqual(['name']);
    });

    it('should handle variables at start and end', () => {
      const content = '{{start}} middle {{end}}';
      const variables = parsePromptVariables(content);

      expect(variables).toEqual(['start', 'end']);
    });

    it('should handle consecutive variables', () => {
      const content = '{{var1}}{{var2}}{{var3}}';
      const variables = parsePromptVariables(content);

      expect(variables).toEqual(['var1', 'var2', 'var3']);
    });

    it('should handle multiline content', () => {
      const content = `
 Line 1: {{var1}}
 Line 2: {{var2}}
 Line 3: {{var1}}
 `;
      const variables = parsePromptVariables(content);

      expect(variables).toEqual(['var1', 'var2']);
    });

    it('should not extract variables with spaces', () => {
      const content = '{{ name }} is not valid';
      const variables = parsePromptVariables(content);

      expect(variables).toEqual([]);
    });

    it('should not extract variables with special characters', () => {
      const content = '{{name-with-dash}} {{name.with.dot}} {{name@symbol}}';
      const variables = parsePromptVariables(content);

      expect(variables).toEqual([]);
    });
  });

  describe('renderPrompt', () => {
    it('should replace single variable', () => {
      const content = 'Hello {{name}}!';
      const variables = { name: 'Alice' };
      const rendered = renderPrompt(content, variables);

      expect(rendered).toBe('Hello Alice!');
    });

    it('should replace multiple variables', () => {
      const content = 'Hello {{name}}, you are {{age}} years old.';
      const variables = { name: 'Bob', age: '25' };
      const rendered = renderPrompt(content, variables);

      expect(rendered).toBe('Hello Bob, you are 25 years old.');
    });

    it('should replace duplicate variables', () => {
      const content = '{{name}} loves {{name}}!';
      const variables = { name: 'Charlie' };
      const rendered = renderPrompt(content, variables);

      expect(rendered).toBe('Charlie loves Charlie!');
    });

    it('should handle missing variables', () => {
      const content = 'Hello {{name}}, you are {{age}} years old.';
      const variables = { name: 'David' };
      const rendered = renderPrompt(content, variables);

      expect(rendered).toBe('Hello David, you are {{age}} years old.');
    });

    it('should handle extra variables', () => {
      const content = 'Hello {{name}}!';
      const variables = { name: 'Eve', age: '30', city: 'NYC' };
      const rendered = renderPrompt(content, variables);

      expect(rendered).toBe('Hello Eve!');
    });

    it('should handle empty variables object', () => {
      const content = 'Hello {{name}}!';
      const variables = {};
      const rendered = renderPrompt(content, variables);

      expect(rendered).toBe('Hello {{name}}!');
    });

    it('should handle content without variables', () => {
      const content = 'Plain text without variables';
      const variables = { name: 'Frank' };
      const rendered = renderPrompt(content, variables);

      expect(rendered).toBe('Plain text without variables');
    });

    it('should handle empty content', () => {
      const content = '';
      const variables = { name: 'Grace' };
      const rendered = renderPrompt(content, variables);

      expect(rendered).toBe('');
    });

    it('should handle variables with underscores', () => {
      const content = 'User: {{user_name}}, Email: {{user_email}}';
      const variables = { user_name: 'Henry', user_email: 'henry@example.com' };
      const rendered = renderPrompt(content, variables);

      expect(rendered).toBe('User: Henry, Email: henry@example.com');
    });

    it('should handle variables with numbers', () => {
      const content = '{{var1}} and {{var2}}';
      const variables = { var1: 'First', var2: 'Second' };
      const rendered = renderPrompt(content, variables);

      expect(rendered).toBe('First and Second');
    });

    it('should handle multiline content', () => {
      const content = `
 Name: {{name}}
 Age: {{age}}
 City: {{city}}
 `;
      const variables = { name: 'Ivy', age: '28', city: 'SF' };
      const rendered = renderPrompt(content, variables);

      expect(rendered).toContain('Name: Ivy');
      expect(rendered).toContain('Age: 28');
      expect(rendered).toContain('City: SF');
    });

    it('should handle special characters in values', () => {
      const content = 'Message: {{message}}';
      const variables = { message: 'Hello! @user #hashtag $100' };
      const rendered = renderPrompt(content, variables);

      expect(rendered).toBe('Message: Hello! @user #hashtag $100');
    });

    it('should handle consecutive variables', () => {
      const content = '{{first}}{{second}}{{third}}';
      const variables = { first: 'A', second: 'B', third: 'C' };
      const rendered = renderPrompt(content, variables);

      expect(rendered).toBe('ABC');
    });

    it('should handle variables at start and end', () => {
      const content = '{{start}} middle {{end}}';
      const variables = { start: 'BEGIN', end: 'END' };
      const rendered = renderPrompt(content, variables);

      expect(rendered).toBe('BEGIN middle END');
    });

    it('should handle empty string values', () => {
      const content = 'Hello {{name}}!';
      const variables = { name: '' };
      const rendered = renderPrompt(content, variables);

      expect(rendered).toBe('Hello !');
    });

    it('should handle complex template', () => {
      const content = `
You are a {{role}} assistant.
Your name is {{name}}.
You help users with {{task}}.

User: {{user_message}}
Assistant: {{assistant_response}}
 `;
      const variables = {
        role: 'helpful',
        name: 'AI',
        task: 'coding',
        user_message: 'Help me',
        assistant_response: 'Sure!',
      };
      const rendered = renderPrompt(content, variables);

      expect(rendered).toContain('You are a helpful assistant.');
      expect(rendered).toContain('Your name is AI.');
      expect(rendered).toContain('You help users with coding.');
      expect(rendered).toContain('User: Help me');
      expect(rendered).toContain('Assistant: Sure!');
    });

    it('should preserve original content when no variables provided', () => {
      const content = 'Hello {{name}}, welcome to {{place}}!';
      const variables = {};
      const rendered = renderPrompt(content, variables);

      expect(rendered).toBe(content);
    });
  });

  describe('Integration tests', () => {
    it('should parse and render correctly', () => {
      const content =
        'Hello {{name}}, you are {{age}} years old from {{city}}.';
      const variables = parsePromptVariables(content);

      expect(variables).toEqual(['name', 'age', 'city']);

      const values = { name: 'John', age: '30', city: 'NYC' };
      const rendered = renderPrompt(content, values);

      expect(rendered).toBe('Hello John, you are 30 years old from NYC.');
    });

    it('should handle partial rendering', () => {
      const content = 'User {{user}} wants {{item1}} and {{item2}}.';
      const variables = parsePromptVariables(content);

      expect(variables).toEqual(['user', 'item1', 'item2']);

      const partialValues = { user: 'Alice', item1: 'coffee' };
      const rendered = renderPrompt(content, partialValues);

      expect(rendered).toBe('User Alice wants coffee and {{item2}}.');
    });
  });
});
