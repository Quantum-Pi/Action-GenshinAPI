import * as core from '@actions/core';
import { convertToGOODStatKey, EnkaClient, FightProp, getCharactersById, StatKey } from 'enka-network-api';
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
		const akashaUserBuild = await akasha.getBuildsForUser(uuid);
		const akashaData = akashaUser.data.map(data => {
			const build = akashaUserBuild.data.find(v => v.characterId === data.characterId);
			return {
				...data,
				stats: build?.stats,
				element: build?.characterMetadata.element
			};
		});
		const json = JSON.stringify({
			akasha: await Promise.all(
				akashaData.map(
					async ({ calculations: { fit }, name, characterId, weapon: { flat, name: weaponName, icon: weaponIcon }, icon, stats, element }) => ({
						name,
						icon,
						stats,
						element,
						calculations: {
							short: fit.short,
							name: fit.name,
							details: fit.details.replaceAll('"', "'"),
							weapon: fit.weapon.name,
							ranking: fit.ranking,
							outOf: fit.outOf
						},
						weapon: {
							weaponStats: flat.weaponStats.reduce(
								(prev, { stat, statValue }) => ({
									...prev,
									[convertToGOODStatKey(stat.replace('_BASE', '') as FightProp)]: statValue
								}),
								{} as Record<StatKey, number>
							),
							name: weaponName,
							icon: weaponIcon
						},
						character: getCharactersById(characterId, enka)[0]
							.getStats(6, 90)
							.reduce(
								(prev, stat) => ({
									...prev,
									[convertToGOODStatKey(stat.fightProp.replace('_BASE', '') as FightProp)]: stat.getMultipliedValue()
								}),
								{} as Record<StatKey, number>
							)
					})
				)
			),
			good: goodSrc ? good : good
		})
			.replace(/\\/g, '')
			.replace(/('|\$|\(|\)|"|!)/g, '\\$1')
			// // eslint-disable-next-line no-control-regex
			.replace(/[^\x00-\x7F]/g, '');

		core.setOutput(
			'json',
			`import { IGOOD, CharacterData, ArtifactData, ArtifactSet, WeaponData } from 'enka-network-api';
import Akasha from 'akasha-system.js';
export interface EnkaData {
	characters: CharacterData[];
	artifactSets: ArtifactSet[];
	weapons: WeaponData[];
	artifacts: ArtifactData[];
}

export interface MiniAkashaSystemStat {
	name: string;
	icon: string;
	element: string;
	stats: Record<string, number>;
	calculations: {
		short: string;
		name: string;
		details: string;
		weapon: string;
		ranking: number;
		outOf: number;
	};
	weapon: {
		weaponStats: Record<StatKey, number>;
		name: string;
		icon: string;
	};
	character: Record<StatKey, number>;
}

export type AkashaSystemStats = Awaited<ReturnType<Akasha['getCalculationsForUser']>>['data'];
export interface GenshinProfile {
	akasha: MiniAkashaSystemStat[];
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
