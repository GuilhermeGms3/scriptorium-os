import { fetchEbibleUsfm } from "./ebible-usfm";
import { BPM_EDITION } from "./import-ebible-bpm";

process.stdout.write(`${JSON.stringify(await fetchEbibleUsfm(BPM_EDITION), null, 2)}\n`);
