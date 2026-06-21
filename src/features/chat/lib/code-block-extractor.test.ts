import { describe, it, expect } from 'vitest';
import { extractCodeBlocks } from './code-block-extractor';

describe('extractCodeBlocks', () => {
  it('should extract python code blocks', () => {
    const content = `
Some text before

\`\`\`python
print("Hello, World!")
x = 10
\`\`\`

Some text after
 `;

    const blocks = extractCodeBlocks(content);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toEqual({
      id: '0',
      content: 'print("Hello, World!")\nx = 10',
      language: 'python',
    });
  });

  it('should extract mermaid code blocks', () => {
    const content = `
\`\`\`mermaid
graph TD
 A --> B
\`\`\`
 `;

    const blocks = extractCodeBlocks(content);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toEqual({
      id: '0',
      content: 'graph TD\n A --> B',
      language: 'mermaid',
    });
  });

  it('should extract multiple code blocks with correct indices', () => {
    const content = `
\`\`\`python
print("First")
\`\`\`

Some text

\`\`\`mermaid
graph LR
\`\`\`

More text

\`\`\`python
print("Second")
\`\`\`
 `;

    const blocks = extractCodeBlocks(content);

    expect(blocks).toHaveLength(3);
    expect(blocks[0]).toEqual({
      id: '0',
      content: 'print("First")',
      language: 'python',
    });
    expect(blocks[1]).toEqual({
      id: '1',
      content: 'graph LR',
      language: 'mermaid',
    });
    expect(blocks[2]).toEqual({
      id: '2',
      content: 'print("Second")',
      language: 'python',
    });
  });

  it('should ignore non-python and non-mermaid code blocks', () => {
    const content = `
\`\`\`javascript
console.log("ignored");
\`\`\`

\`\`\`python
print("included")
\`\`\`

\`\`\`typescript
const x = 1;
\`\`\`

\`\`\`mermaid
graph TD
\`\`\`

\`\`\`bash
echo "ignored"
\`\`\`
 `;

    const blocks = extractCodeBlocks(content);

    expect(blocks).toHaveLength(2);
    expect(blocks[0].language).toBe('python');
    expect(blocks[1].language).toBe('mermaid');
  });

  it('should handle code blocks without language specifier', () => {
    const content = `
\`\`\`
some code
\`\`\`
 `;

    const blocks = extractCodeBlocks(content);

    expect(blocks).toHaveLength(0);
  });

  it('should handle empty content', () => {
    const blocks = extractCodeBlocks('');
    expect(blocks).toHaveLength(0);
  });

  it('should handle content without code blocks', () => {
    const content = 'Just some regular text without any code blocks';
    const blocks = extractCodeBlocks(content);
    expect(blocks).toHaveLength(0);
  });

  it('should handle case-insensitive language names', () => {
    const content = `
\`\`\`PYTHON
print("uppercase")
\`\`\`

\`\`\`Python
print("mixed case")
\`\`\`

\`\`\`Mermaid
graph TD
\`\`\`
 `;

    const blocks = extractCodeBlocks(content);

    expect(blocks).toHaveLength(3);
    expect(blocks[0].language).toBe('python');
    expect(blocks[1].language).toBe('python');
    expect(blocks[2].language).toBe('mermaid');
  });

  it('should trim whitespace from code content', () => {
    const content = `
\`\`\`python


 print("test") 

\`\`\`
 `;

    const blocks = extractCodeBlocks(content);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].content).toBe('print("test")');
  });

  it('should preserve internal whitespace and newlines', () => {
    const content = `
\`\`\`python
def hello():
 print("Hello")
  return True
\`\`\`
 `;

    const blocks = extractCodeBlocks(content);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].content).toContain(' print("Hello")');
    expect(blocks[0].content).toContain(' return True');
  });

  it('should handle adjacent code blocks', () => {
    const content = `
\`\`\`python
print("first")
\`\`\`
\`\`\`python
print("second")
\`\`\`
 `;

    const blocks = extractCodeBlocks(content);

    expect(blocks).toHaveLength(2);
    expect(blocks[0].id).toBe('0');
    expect(blocks[1].id).toBe('1');
  });

  it('should handle code blocks with special characters', () => {
    const content = `
\`\`\`python
text = "Hello @user! #hashtag $money"
regex = /[a-z]+/g
\`\`\`
 `;

    const blocks = extractCodeBlocks(content);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].content).toContain('@user');
    expect(blocks[0].content).toContain('#hashtag');
    expect(blocks[0].content).toContain('$money');
  });
});
