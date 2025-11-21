import * as fs from 'fs';
import * as path from 'path';
import { FigmaConverterService } from '../src/modules/figma/application/figma-converter.service';

// Load the figma-response.json
const figmaResponsePath = path.join(__dirname, 'figma-response.json');
const figmaData = JSON.parse(fs.readFileSync(figmaResponsePath, 'utf-8'));

// Initialize the converter service
const converter = new FigmaConverterService();

// Convert the Figma data to HTML and CSS
const result = converter.convert(figmaData.document);

// Create the output directory if it doesn't exist
const outputDir = path.join(__dirname, 'outputs');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Write the HTML file
const htmlPath = path.join(outputDir, 'test-visual.html');
const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Figma to HTML - Visual Test</title>
  <style>
    ${result.css}
  </style>
</head>
<body>
  <div style="position: fixed; top: 10px; right: 10px; background: rgba(0,0,0,0.8); color: white; padding: 12px 16px; border-radius: 8px; font-family: monospace; font-size: 12px; z-index: 9999;">
    <div style="font-weight: bold; margin-bottom: 4px;">✅ Multiple Frames Test</div>
    <div>Direction: Vertical (Column)</div>
    <div>Layout: Flex</div>
    <div>Gap: 32px</div>
  </div>
  ${result.html}
</body>
</html>`;

fs.writeFileSync(htmlPath, fullHtml);

// Write the CSS to a separate file for inspection
const cssPath = path.join(outputDir, 'test-visual.css');
fs.writeFileSync(cssPath, result.css);

// Write the HTML only to a separate file for inspection
const htmlOnlyPath = path.join(outputDir, 'test-visual-html-only.html');
fs.writeFileSync(htmlOnlyPath, result.html);

console.log('✅ Visual test files generated successfully!');
console.log('');
console.log('📁 Output files:');
console.log(`   HTML: ${htmlPath}`);
console.log(`   CSS:  ${cssPath}`);
console.log(`   HTML (no styles): ${htmlOnlyPath}`);
console.log('');
console.log('🌐 Open the HTML file in your browser to view:');
console.log(`   open ${htmlPath}`);
console.log('');
console.log('📊 Statistics:');
console.log(`   HTML length: ${result.html.length} characters`);
console.log(`   CSS length:  ${result.css.length} characters`);

// Check if artboards-container is present (multiple frames)
const hasContainer = result.html.includes('artboards-container');
const containerCss = result.css.match(/\.artboards-container\s*\{[^}]+\}/)?.[0] || '';
const isVertical = containerCss.includes('flex-direction: column');

console.log('');
console.log('🔍 Layout Analysis:');
console.log(`   Multiple frames detected: ${hasContainer ? '✅ YES' : '❌ NO'}`);
console.log(`   Container uses vertical layout: ${isVertical ? '✅ YES (column)' : '❌ NO (row or missing)'}`);

if (hasContainer && isVertical) {
  console.log('');
  console.log('🎉 SUCCESS: Frames will be stacked vertically!');
} else if (hasContainer && !isVertical) {
  console.log('');
  console.log('⚠️  WARNING: Multiple frames detected but not using vertical layout!');
}

