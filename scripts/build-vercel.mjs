import './prepare-server.cjs';
import './publish-boards.cjs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
// Invoke the native Next CLI directly, including on Windows.
const cli=fileURLToPath(new URL('../node_modules/next/dist/bin/next',import.meta.url));
const result=spawnSync(process.execPath,[cli,'build'],{stdio:'inherit',env:process.env});
if(result.error)throw result.error;
process.exitCode=result.status??1;
