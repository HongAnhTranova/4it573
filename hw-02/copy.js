var fs = require("fs");

if (!fs.existsSync("instructions.txt")) {
  console.log("Soubor instructions.txt neexistuje!");
  process.exit(1);
}

var instructions = fs.readFileSync("instructions.txt", "utf-8").trim();
var lines = instructions.split("\n");

var source = lines.at(0).trim();
var destination = lines.at(1).trim();

if (!fs.existsSync(source)) {
  console.log("Zdrojovy soubor '" + source + "' neexistuje!");
  process.exit(1);
}

var data = fs.readFileSync(source, "utf-8");
fs.writeFileSync(destination, data);

console.log("Hotovo! Obsah '" + source + "' byl zkopirovan do '" + destination + "'.");
