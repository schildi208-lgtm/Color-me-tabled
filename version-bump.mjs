import { readFileSync, writeFileSync } from "node:fs";

const targetVersion = process.env.npm_package_version;

// manifest.json auf die neue Version setzen
const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const { minAppVersion } = manifest;
manifest.version = targetVersion;
writeFileSync("manifest.json", JSON.stringify(manifest, null, "\t") + "\n");

// versions.json um Version -> minAppVersion ergänzen
const versions = JSON.parse(readFileSync("versions.json", "utf8"));
versions[targetVersion] = minAppVersion;
writeFileSync("versions.json", JSON.stringify(versions, null, "\t") + "\n");
