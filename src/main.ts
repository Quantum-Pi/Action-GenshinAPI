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
		const enka = new EnkaClient({ userAgent: usage });
		await enka.cachedAssetsManager.cacheDirectorySetup();
		await enka.cachedAssetsManager.fetchAllContents();

		const enkaUser = await enka.fetchUser(uuid);
		const good = enkaUser.toGOOD();

		const deleteRedundantKeys = (obj: Record<string, any> | null): Record<string, any> | null => {
			if (obj && typeof obj === 'object') {
				delete obj['enka'];
				Object.keys(obj).forEach(key => {
					if (typeof obj === 'object') {
						deleteRedundantKeys(obj[key]);
					}
				});
			}
			return obj;
		};
		const enkaData = {
			achievements: enkaUser.achievements,
			level: enkaUser.level,
			nickname: enkaUser.nickname,
			showCharacterDetails: enkaUser.showCharacterDetails,
			spiralAbyss: deleteRedundantKeys(enkaUser.spiralAbyss),
			uid: enkaUser.uid,
			characters: deleteRedundantKeys(enkaUser.characters),
			maxFriendshipCount: enkaUser.maxFriendshipCount,
			profileCard: deleteRedundantKeys(enkaUser.profileCard),
			showConstellationPreview: enkaUser.showConstellationPreview,
			theater: deleteRedundantKeys(enkaUser.theater),
			url: enkaUser.url,
			charactersPreview: deleteRedundantKeys(enkaUser.charactersPreview),
			profilePicture: deleteRedundantKeys(enkaUser.profilePicture),
			signature: enkaUser.signature,
			worldLevel: enkaUser.worldLevel
		};
		console.log(enkaData);

		const akashaUser = await akasha.getCalculationsForUser(uuid);
		console.log(akashaUser);

		const json = {
			enka: enkaData,
			akasha: akashaUser.data,
			good
		};

		core.setOutput('json', json);
	} catch (error) {
		// Fail the workflow run if an error occurs
		if (error instanceof Error) core.setFailed(error.message);
	}
}
