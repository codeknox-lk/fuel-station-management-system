/* eslint-disable */

const fs = require('fs');

try {
    const data = fs.readFileSync('lint_results.json', 'utf8');
    const results = JSON.parse(data);

    const settingsErrors = results
        .filter(result => result.filePath.includes('src\\app\\(app)\\settings') && result.errorCount > 0)
        .map(result => ({
            file: result.filePath.split('shed-admin\\')[1],
            errors: result.errorCount
        }));

    console.log('Settings Errors:');
    settingsErrors.forEach(e => console.log(`${e.file}: ${e.errors}`));

} catch (err) {
    console.error('Error parsing lint results:', err);
}
