const fs = require('fs');
const path = require('path');

// Configuration
const TARGET_DIRS = ['src/app', 'src/components'];
const FILE_EXTENSIONS = ['.ts', '.tsx'];
// Regex to find toLocaleString calls that aren't already guarded
// We want to match: value.toLocaleString(...)
// But NOT: (value || 0).toLocaleString(...) or (value ?? 0).toLocaleString(...)
// And NOT: new Date(...).toLocaleString(...)
const UNSAFE_TOLOCALE_REGEX = /([a-zA-Z0-9_?.\[\]\(\)]+)\.toLocaleString\(/g;

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    let modified = false;

    content = content.replace(UNSAFE_TOLOCALE_REGEX, (match, variable) => {
        // Skip if it looks like a Date object or already safe
        if (variable.includes('Date') || variable.includes('|| 0') || variable.includes('?? 0')) {
            return match;
        }

        // Skip if variable is a number literal
        if (!isNaN(parseFloat(variable)) && isFinite(variable)) {
            return match;
        }

        // Apply automatic guard: (variable || 0).toLocaleString(
        // We use || 0 to handle null, undefined, and NaN
        return `(${variable} || 0).toLocaleString(`;
    });

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Fixed: ${filePath}`);
    }
}

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            walkDir(filePath);
        } else if (FILE_EXTENSIONS.includes(path.extname(filePath))) {
            processFile(filePath);
        }
    });
}

console.log('Starting bulk safety fix for toLocaleString...');
TARGET_DIRS.forEach(dir => {
    if (fs.existsSync(dir)) {
        walkDir(dir);
    } else {
        console.warn(`Directory not found: ${dir}`);
    }
});
console.log('Bulk fix completed.');
