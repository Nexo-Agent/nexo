import { readdir, readFile, writeFile, stat } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const streamdownDir = join(rootDir, 'src/ui/atoms/streamdown');

async function getAllFiles(dir, fileList = []) {
  const files = await readdir(dir);
  
  for (const file of files) {
    const filePath = join(dir, file);
    const fileStat = await stat(filePath);
    
    if (fileStat.isDirectory()) {
      await getAllFiles(filePath, fileList);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  }
  
  return fileList;
}

async function addTsNoCheck(filePath) {
  const content = await readFile(filePath, 'utf-8');
  
  // Skip if already has @ts-nocheck
  if (content.includes('@ts-nocheck')) {
    console.log(`Skipped (already has @ts-nocheck): ${filePath}`);
    return;
  }
  
  // Add @ts-nocheck at the beginning
  const newContent = '// @ts-nocheck\n' + content;
  await writeFile(filePath, newContent, 'utf-8');
  console.log(`Added @ts-nocheck to: ${filePath}`);
}

async function main() {
  try {
    const files = await getAllFiles(streamdownDir);
    console.log(`Found ${files.length} TypeScript files in streamdown folder`);
    
    for (const file of files) {
      await addTsNoCheck(file);
    }
    
    console.log('Done!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();

