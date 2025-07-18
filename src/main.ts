import * as core from '@actions/core';
import { convertToGOODKey, convertToGOODStatKey, EnkaClient, FightProp, getCharactersById, StatKey, WeaponType } from 'enka-network-api';
import Akasha from 'akasha-system.js';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
type Options =
	| {
			local: true;
			uuid: string;
			cb: (output: string) => void;
	  }
	| {
			local: false;
	  };

export async function run(opt: Options = { local: false }): Promise<void> {
	try {
		const { local } = opt;

		const uuid: string = local ? opt.uuid : core.getInput('uuid');
		const usage: string = local ? 'testing' : core.getInput('usage');
		const goodSrc: string | null = local ? null : core.getInput('goodSrc');
		const outputDir: string = local ? process.cwd() : core.getInput('outputDir') || '';

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
				stats: Object.entries(build?.stats ?? {}).reduce(
					(prev, [stat, value]) => ({
						...prev,
						[stat]: value.value ?? 0
					}),
					{}
				)
			};
		});
		const json = JSON.stringify({
			akasha: await Promise.all(
				akashaData.map(async ({ calculations: { fit }, name, characterId, weapon: { flat, name: weaponName, icon: weaponIcon }, icon, stats }) => ({
					name,
					icon,
					stats,
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
						stars: flat.stars,
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
				}))
			),
			good: goodSrc ? good : good,
			characters: enka.getAllCharacters().reduce(
				(prev, { name, element, rarity, stars, weaponType }) => ({
					...prev,
					[name.get('en').replaceAll(' ', '')]: {
						element: element?.name.get('en'),
						stars,
						weaponType: weaponType
					}
				}),
				{} as Record<string, { element: string | undefined; stars: number; weaponType: WeaponType }>
			),
			weapons: enka.getAllWeapons(true).reduce(
				(prev, { name, stars, weaponType }) => ({
					...prev,
					[convertToGOODKey(name.get('en'))]: {
						stars,
						weaponType
					}
				}),
				{}
			)
		});
		// .replace(/\\/g, '')
		// .replace(/('|\$|\(|\)|"|!)/g, '\\$1')
		// // // eslint-disable-next-line no-control-regex
		// .replace(/[^\x00-\x7F]/g, '');
		const output = `import { IGOOD, CharacterData, ArtifactData, ArtifactSet, WeaponData, StatKey, WeaponType } from 'enka-network-api';
import Akasha from 'akasha-system.js';
export interface EnkaData {
	characters: CharacterData[];
	artifactSets: ArtifactSet[];
	weapons: WeaponData[];
	artifacts: ArtifactData[];
}

export type BuildStatKey =
	| 'critRate'
	| 'critDamage'
	| 'energyRecharge'
	| 'healingBonus'
	| 'incomingHealingBonus'
	| 'elementalMastery'
	| 'physicalDamageBonus'
	| 'geoDamageBonus'
	| 'cryoDamageBonus'
	| 'pyroDamageBonus'
	| 'anemoDamageBonus'
	| 'hydroDamageBonus'
	| 'dendroDamageBonus'
	| 'electroDamageBonus'
	| 'maxHp'
	| 'atk'
	| 'def';

export interface MiniAkashaSystemStat {
	name: string;
	icon: string;
	stats: Record<BuildStatKey, number> | {};
	calculations: {
		short: string;
		name: string;
		details: string;
		weapon: string;
		ranking: number;
		outOf: number;
	};
	weapon: {
		weaponStats: Partial<Record<StatKey, number>>;
		name: string;
		stars: number;
		icon: string;
	};
	character: Partial<Record<StatKey, number>>;
}

export interface CharacterRecord {
    element?: string;
	stars: number;
	weaponType: WeaponType;
}

export interface WeaponRecord {
	stars: number;
	weaponType: WeaponType;
}

export type AkashaSystemStats = Awaited<ReturnType<Akasha['getCalculationsForUser']>>['data'];
export interface GenshinProfile {
	akasha: MiniAkashaSystemStat[];
	good: IGOOD;
	characters: Record<string, CharacterRecord>;
	weapons: Record<string, WeaponRecord>;
}

export const genshinProfile: GenshinProfile = ${json};	
`;
		if (local) {
			opt.cb(output);
		} else {
			core.info(`Current directory: ${process.cwd()}`);
			core.info(`Writing to path: ${join('./', outputDir, 'genshin_raw.ts')}`);

			if (outputDir && !existsSync(outputDir)) {
				mkdirSync(outputDir, { recursive: true });
				core.info(`Created directory: ${outputDir}`);
			}
			writeFileSync(join('./', outputDir, 'genshin_raw.ts'), output);
			core.info(`File written successfully`);

			core.setOutput('json', JSON.stringify({ success: true, fileGenerated: 'genshin_raw.ts' }));
		}
	} catch (error) {
		// Fail the workflow run if an error occurs
		if (error instanceof Error) core.setFailed(error.message);
	}
}
