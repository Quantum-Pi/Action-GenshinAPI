/**
 * The entrypoint for the action.
 */
import { writeFileSync } from 'node:fs';
import { run } from '../src/main';
import dotenv from 'dotenv';

dotenv.config();

// eslint-disable-next-line @typescript-eslint/no-floating-promises
if (process.env.UUID) {
	run({
		local: true,
		uuid: process.env.UUID,
		cb: output => {
			console.log(output);
			writeFileSync('./test/output.ts', output);
		}
	});
} else {
	console.error('UUID not set in env');
}
