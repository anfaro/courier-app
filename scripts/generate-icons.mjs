import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { Resvg } from "@resvg/resvg-js";

const svg = readFileSync("public/icon.svg", "utf-8");

const sizes = [96, 192, 512];

mkdirSync("public", { recursive: true });

for (const size of sizes) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: size },
    background: "rgba(0,0,0,0)",
  });
  const png = resvg.render().asPng();
  writeFileSync(`public/icon-${size}x${size}.png`, png);
  console.log(`Generated public/icon-${size}x${size}.png`);
}
