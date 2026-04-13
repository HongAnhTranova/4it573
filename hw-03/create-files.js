var fs = require("fs/promises");
var path = require("path");

var dir = __dirname;

async function main() {
  var instructions = await fs.readFile(path.join(dir, "instrukce.txt"), "utf-8");
  var n = Number(instructions.trim());

  var promises = [];
  for (var i = 0; i <= n; i++) {
    promises.push(fs.writeFile(path.join(dir, i + ".txt"), "Soubor " + i));
  }

  await Promise.all(promises);

  console.log("Hotovo! Vytvoreno " + (n + 1) + " souboru.");
}

main();
