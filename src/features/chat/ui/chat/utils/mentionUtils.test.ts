import { describe, it, expect } from 'vitest';
import { parseMessageMentions } from './mentionUtils';

describe('parseMessageMentions', () => {
  it('should parse single mention at the start', () => {
    const result = parseMessageMentions('@agent1 Hello world');

    expect(result.mentions).toEqual(['agent1']);
    expect(result.cleanedContent).toBe('Hello world');
  });

  it('should parse multiple mentions at the start', () => {
    const result = parseMessageMentions('@agent1 @agent2 @agent3 Message');

    expect(result.mentions).toEqual(['agent1', 'agent2', 'agent3']);
    expect(result.cleanedContent).toBe('Message');
  });

  it('should handle mentions with dots and hyphens', () => {
    const result = parseMessageMentions(
      '@agent.id @my-agent @test.agent-1 Text'
    );

    expect(result.mentions).toEqual(['agent.id', 'my-agent', 'test.agent-1']);
    expect(result.cleanedContent).toBe('Text');
  });

  it('should return empty mentions if no @ at start', () => {
    const result = parseMessageMentions('Hello @agent1');

    expect(result.mentions).toEqual([]);
    expect(result.cleanedContent).toBe('Hello @agent1');
  });

  it('should return empty mentions for empty string', () => {
    const result = parseMessageMentions('');

    expect(result.mentions).toEqual([]);
    expect(result.cleanedContent).toBe('');
  });

  it('should handle content with only mentions', () => {
    const result = parseMessageMentions('@agent1 @agent2');

    expect(result.mentions).toEqual(['agent1', 'agent2']);
    expect(result.cleanedContent).toBe('');
  });

  it('should handle single mention without trailing space', () => {
    const result = parseMessageMentions('@agent1');

    expect(result.mentions).toEqual(['agent1']);
    expect(result.cleanedContent).toBe('');
  });

  it('should handle mentions with extra whitespace', () => {
    const result = parseMessageMentions('@agent1 @agent2 Message');

    expect(result.mentions).toEqual(['agent1', 'agent2']);
    expect(result.cleanedContent).toBe('Message');
  });

  it('should handle mentions with numbers', () => {
    const result = parseMessageMentions('@agent123 @bot456 Text');

    expect(result.mentions).toEqual(['agent123', 'bot456']);
    expect(result.cleanedContent).toBe('Text');
  });

  it('should not parse mentions in the middle of content', () => {
    const result = parseMessageMentions('Hello @agent1 world');

    expect(result.mentions).toEqual([]);
    expect(result.cleanedContent).toBe('Hello @agent1 world');
  });

  it('should handle @ symbol alone at start', () => {
    const result = parseMessageMentions('@ hello');

    expect(result.mentions).toEqual([]);
    expect(result.cleanedContent).toBe('@ hello');
  });

  it('should handle mentions with mixed case', () => {
    const result = parseMessageMentions('@Agent1 @AGENT2 @AgEnT3 Message');

    expect(result.mentions).toEqual(['Agent1', 'AGENT2', 'AgEnT3']);
    expect(result.cleanedContent).toBe('Message');
  });

  it('should trim cleaned content', () => {
    const result = parseMessageMentions('@agent1 Message ');

    expect(result.mentions).toEqual(['agent1']);
    expect(result.cleanedContent).toBe('Message');
  });

  it('should handle newlines after mentions', () => {
    const result = parseMessageMentions('@agent1 @agent2\nMessage on new line');

    expect(result.mentions).toEqual(['agent1', 'agent2']);
    expect(result.cleanedContent).toBe('Message on new line');
  });

  it('should parse mentions even with special characters after', () => {
    // The regex matches @agent and stops at special characters
    const result = parseMessageMentions('@agent! @agent# Message');

    expect(result.mentions).toEqual(['agent']);
    expect(result.cleanedContent).toBe('! @agent# Message');
  });

  it('should parse mentions and stop at underscores', () => {
    // Underscores are not allowed, so it stops at the underscore
    const result = parseMessageMentions('@agent_1 Message');

    expect(result.mentions).toEqual(['agent']);
    expect(result.cleanedContent).toBe('_1 Message');
  });

  it('should handle complex valid mention patterns', () => {
    const result = parseMessageMentions(
      '@agent.v1 @bot-2.0 @test123 Complex message'
    );

    expect(result.mentions).toEqual(['agent.v1', 'bot-2.0', 'test123']);
    expect(result.cleanedContent).toBe('Complex message');
  });

  it('should parse mentions and stop at punctuation', () => {
    // Comma and exclamation are not allowed, so it parses @agent1 and stops
    const result = parseMessageMentions('@agent1, @agent2! Message');

    expect(result.mentions).toEqual(['agent1']);
    expect(result.cleanedContent).toBe(', @agent2! Message');
  });

  it('should handle null or undefined gracefully', () => {
    const result1 = parseMessageMentions(null as unknown as string);
    const result2 = parseMessageMentions(undefined as unknown as string);

    expect(result1.mentions).toEqual([]);
    expect(result1.cleanedContent).toBe(null);

    expect(result2.mentions).toEqual([]);
    expect(result2.cleanedContent).toBe(undefined);
  });
});
