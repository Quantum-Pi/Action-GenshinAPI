import * as core from '@actions/core';
import { EnkaClient } from 'enka-network-api';
import Akasha from 'akasha-system.js';

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
	try {
		const uuid: string = core.getInput('uuid');
		const usage: string = core.getInput('usage');
		const goodSrc: string | null = core.getInput('goodSrc');

		const akasha = new Akasha(usage);
		const enka = new EnkaClient({ userAgent: usage });
		await enka.cachedAssetsManager.cacheDirectorySetup();
		await enka.cachedAssetsManager.fetchAllContents();

		const enkaUser = await enka.fetchUser(uuid);
		const good = enkaUser.toGOOD();

		const akashaUser = await akasha.getCalculationsForUser(uuid);

		const json = JSON.stringify({
			akasha: akashaUser.data,
			good: goodSrc ? good : good
		});

		core.setOutput(
			'json',
			`import { IGOOD } from 'enka-network-api';
import Akasha from 'akasha-system.js';
export type AkashaSystemStats = Awaited<ReturnType<Akasha['getCalculationsForUser']>>['data'];
export interface GenshinProfile {
		akasha: AkashaSystemStats;
		good: IGOOD;
}	
export const genshinProfile: GenshinProfile = ${json};	
`
		);
	} catch (error) {
		// Fail the workflow run if an error occurs
		if (error instanceof Error) core.setFailed(error.message);
	}
}
