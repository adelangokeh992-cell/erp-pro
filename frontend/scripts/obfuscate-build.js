/**
 * Post-build obfuscation for production JS chunks.
 * Runs after `npm run build` when OBFUSCATE_BUILD=true (optional).
 * Uses mild options to avoid breaking React/runtime.
 */
const path = require('path');
const fs = require('fs');

if (process.env.OBFUSCATE_BUILD !== 'true') {
  console.log('Obfuscation skipped (set OBFUSCATE_BUILD=true to enable).');
  process.exit(0);
}

const buildJsDir = path.join(__dirname, '..', 'build', 'static', 'js');
if (!fs.existsSync(buildJsDir)) {
  console.log('build/static/js not found, skipping obfuscation.');
  process.exit(0);
}

let JavaScriptObfuscator;
try {
  JavaScriptObfuscator = require('javascript-obfuscator');
} catch (e) {
  console.warn('javascript-obfuscator not found. Run: npm install --save-dev javascript-obfuscator');
  process.exit(0);
}

const options = {
  compact: true,
  controlFlowFlattening: false,
  deadCodeInjection: false,
  debugProtection: false,
  disableConsoleOutput: false,
  identifierNamesGenerator: 'hexadecimal',
  renameGlobals: false,
  selfDefending: false,
  simplify: true,
  stringArray: true,
  stringArrayEncoding: [],
  stringArrayThreshold: 0.5,
  transformObjectKeys: false,
  unicodeEscapeSequence: false,
};

const files = fs.readdirSync(buildJsDir).filter((f) => f.endsWith('.js'));
let count = 0;
for (const file of files) {
  const filePath = path.join(buildJsDir, file);
  let code = fs.readFileSync(filePath, 'utf8');
  try {
    const result = JavaScriptObfuscator.obfuscate(code, options);
    fs.writeFileSync(filePath, result.getObfuscatedCode(), 'utf8');
    count++;
    console.log('Obfuscated:', file);
  } catch (err) {
    console.warn('Skip obfuscate', file, err.message);
  }
}
console.log('Obfuscation done. Files processed:', count);
