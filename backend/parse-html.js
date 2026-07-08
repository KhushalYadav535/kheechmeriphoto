const fs = require('fs');
const html = fs.readFileSync(String.raw`C:\Users\khush\.gemini\antigravity-ide\brain\29b3a5ba-85d3-4a01-90f8-c68b81825471\.system_generated\steps\260\content.md`, 'utf-8');

// Basic regex to extract text inside paragraph tags and code blocks
const textMatches = html.match(/<p>.*?<\/p>|<code>.*?<\/code>|<pre>.*?<\/pre>|<h[1-6]>.*?<\/h[1-6]>/gs) || [];
const cleanText = textMatches.map(t => t.replace(/<[^>]+>/g, '').trim()).filter(t => t).join('\n');
console.log(cleanText.substring(0, 3000));
