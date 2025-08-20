#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Updates the PROGRAM_ID in src/types/index.ts based on the program name in main.leo
 */
function updateProgramId() {
  try {
    // Read the Leo source file
    const programPath = path.join(__dirname, '..', 'program', 'src', 'main.leo');
    const sourceCode = fs.readFileSync(programPath, 'utf-8');
    
    // Extract program name
    const programMatch = sourceCode.match(/program\s+([a-zA-Z0-9_]+\.aleo)/);
    
    if (!programMatch || !programMatch[1]) {
      console.error('❌ Could not find program declaration in main.leo');
      process.exit(1);
    }
    
    const programName = programMatch[1];
    console.log(`📦 Found program: ${programName}`);
    
    // Read the types file
    const typesPath = path.join(__dirname, '..', 'src', 'types', 'index.ts');
    let typesContent = fs.readFileSync(typesPath, 'utf-8');
    
    // Update the PROGRAM_ID
    const updatedContent = typesContent.replace(
      /export const PROGRAM_ID = ['"`][^'"`]+['"`];/,
      `export const PROGRAM_ID = '${programName}';`
    );
    
    // Write back to the types file
    fs.writeFileSync(typesPath, updatedContent);
    
    console.log(`✅ Updated PROGRAM_ID to: ${programName}`);
    
  } catch (error) {
    console.error('❌ Error updating program ID:', error);
    process.exit(1);
  }
}

// Run the update
updateProgramId();
