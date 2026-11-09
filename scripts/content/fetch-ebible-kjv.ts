import { fetchEbibleUsfm } from "./ebible-usfm";
import { KJV_EDITION } from "./import-ebible-kjv";

process.stdout.write(`${JSON.stringify(await fetchEbibleUsfm(KJV_EDITION), null, 2)}\n`);
