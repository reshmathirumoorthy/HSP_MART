import fs from "node:fs";

const path = "src/data/productMedia.ts";
let s = fs.readFileSync(path, "utf8");
if ((s.match(/officialName:/g) || []).length > 1) {
  console.log("already patched");
  process.exit(0);
}
s = s.replace(
  /sourceTitle: "([^"]+)",\r?\n(\s+)images:/g,
  (_m, title, sp) =>
    `sourceTitle: "${title}",\r\n${sp}officialName: "${title}",\r\n${sp}images:`,
);
fs.writeFileSync(path, s);
console.log("officialName count", (s.match(/officialName:/g) || []).length);
