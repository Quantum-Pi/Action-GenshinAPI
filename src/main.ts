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

		const enkaData = {
			achievements: enkaUser.achievements,
			level: enkaUser.level,
			nickname: enkaUser.nickname,
			showCharacterDetails: enkaUser.showCharacterDetails,
			spiralAbyss: enkaUser.spiralAbyss,
			uid: enkaUser.uid,
			characters: enkaUser.characters,
			maxFriendshipCount: enkaUser.maxFriendshipCount,
			profileCard: enkaUser.profileCard,
			showConstellationPreview: enkaUser.showConstellationPreview,
			theater: enkaUser.theater,
			url: enkaUser.url,
			charactersPreview: enkaUser.charactersPreview,
			profilePicture: enkaUser.profilePicture,
			signature: enkaUser.signature,
			worldLevel: enkaUser.worldLevel
		};
		console.log(enkaData);

		const akashaUser = await akasha.getCalculationsForUser(uuid);
		console.log(akashaUser);

		const json = {
			enka: enkaData,
			akasha: akashaUser.data,
			good: enkaUser.toGOOD()
		};

		core.setOutput('json', json);
	} catch (error) {
		// Fail the workflow run if an error occurs
		if (error instanceof Error) core.setFailed(error.message);
	}
}
