#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Ajv from 'ajv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ajv = new Ajv({ allErrors: true });

function validateFile(schemaPath, jsonPath, description) {
  try {
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    
    const validate = ajv.compile(schema);
    const valid = validate(data);
    
    if (valid) {
      console.log(`✅ ${description} validation passed: ${path.basename(jsonPath)}`);
      return true;
    } else {
      console.error(`❌ ${description} validation failed: ${path.basename(jsonPath)}`);
      validate.errors.forEach(error => {
        console.error(`  - ${error.instancePath || 'root'}: ${error.message}`);
      });
      return false;
    }
  } catch (error) {
    console.error(`💥 Error validating ${description}: ${error.message}`);
    return false;
  }
}

async function main() {
  const rootDir = path.dirname(__dirname);
  
  let allValid = true;
  
  // Validate components.json
  allValid &= validateFile(
    path.join(rootDir, 'schemas/components.schema.json'),
    path.join(rootDir, 'src/components.json'),
    'Components schema'
  );
  
  // Validate room-layout.json
  allValid &= validateFile(
    path.join(rootDir, 'schemas/room-layout.schema.json'),
    path.join(rootDir, 'src/room-layout.json'),
    'Room layout schema'
  );
  
  if (allValid) {
    console.log('\n🎉 All JSON schema validations passed!');
    process.exit(0);
  } else {
    console.log('\n💀 JSON schema validation failed!');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('💥 Validator crashed:', error.message);
  process.exit(1);
});