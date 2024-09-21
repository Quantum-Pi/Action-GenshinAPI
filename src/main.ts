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

		const akasha = new Akasha(usage);
		const enka = new EnkaClient();
		await enka.cachedAssetsManager.cacheDirectorySetup();
		await enka.cachedAssetsManager.fetchAllContents();

		const enkaUser = await enka.fetchUser(uuid);
		console.log(enkaUser);

		const akashaUser = await akasha.getCalculationsForUser(uuid);
		console.log(akashaUser);
		// const api = new SteamAPI(apiKey);

		const json = {
			enka: enkaUser,
			akasha: akashaUser
		};

		core.setOutput('json', json);
	} catch (error) {
		// Fail the workflow run if an error occurs
		if (error instanceof Error) core.setFailed(error.message);
	}
}
