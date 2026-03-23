import fs from 'fs';

async function test() {
  try {
    const response = await fetch('http://localhost:3000/api/compile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: '\\documentclass{article}\\begin{document}Hello World\\end{document}'
      }),
    });
    
    const buffer = await response.arrayBuffer();
    console.log('Status:', response.status);
    console.log('Buffer length:', buffer.byteLength);
    const firstBytes = Buffer.from(buffer).toString('utf8', 0, 20);
    console.log('First 20 bytes:', firstBytes);
    
    fs.writeFileSync('test.pdf', Buffer.from(buffer));
    console.log('Saved to test.pdf');
  } catch (err: any) {
    console.error('Error:', err.message);
  }
}

test();
