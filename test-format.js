const fs = require('fs');
const path = require('path');

const { WiqlFormatter } = require('./out/formatter');

const files = fs.readdirSync(__dirname).filter(f => f.toLowerCase().endsWith('.wiql'));
if (files.length === 0) {
	console.error('No .wiql samples found in the directory.');
	process.exit(1);
}

for (const file of files) {
	const p = path.join(__dirname, file);
	const text = fs.readFileSync(p, 'utf8');

	console.log(`\n===== File: ${file} =====`);
	console.log('--- Original ---');
	console.log(text);

	try {
		const formatted = WiqlFormatter.format(text, { uppercaseKeywords: true });
		console.log('--- Formatted (uppercaseKeywords = true) ---');
		console.log(formatted);
	} catch (e) {
		console.error('Formatting failed (uppercase=true):', e && e.message ? e.message : e);
	}

	try {
		const formattedNoUpper = WiqlFormatter.format(text, { uppercaseKeywords: false });
		console.log('--- Formatted (uppercaseKeywords = false) ---');
		console.log(formattedNoUpper);
	} catch (e) {
		console.error('Formatting failed (uppercase=false):', e && e.message ? e.message : e);
	}
}

