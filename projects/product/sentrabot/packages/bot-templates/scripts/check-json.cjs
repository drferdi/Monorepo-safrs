const fs = require('node:fs');
const path = require('node:path');
function walk(dir) {
  return fs.readdirSync(dir, {withFileTypes:true}).flatMap(e => {
    const p = path.join(dir,e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}
const roots = ['schemas','templates','governance','evals','ui','examples'].filter(fs.existsSync);
let count = 0;
for (const root of roots) for (const file of walk(root)) if (file.endsWith('.json')) {
  JSON.parse(fs.readFileSync(file,'utf8'));
  count++;
}
console.log(`JSON OK: ${count} files`);
