export enum DataType {
	None,
	
	// map dispos
	Npc,
	Item,
	Mobj,
	Aobj,
	Bshape,
	GobjRes,
	Effect,
	MapParam,
	Maplink,
	
	// registries
	CharacterNpc,
	CharacterMobj,
	CharacterParty,
	CharacterItem,
	CharacterAobj,
	
	MapId,
	ItemList,
	MapItemLotTable,
	EventFlag,

	//parameters
	ParamActionBalloon,
	ParamFade,
	ParamField,
	ParamHouseDoor,
	ParamJump,
	ParamPartyHint,
	ParamPlayer,
	ParamGobj,
	ParamGobjItem,
	DataMinigamePaperAiper,
	DataMinigamePaperFan,
	DataMinigamePaperRunner,
	DataMinigamePaperRunnerai,

	//battle
	Monosiri,
	FallObj,
	Nozzle,
	HeartParam,
	Parameter,

	BattleWeaponMario,
	BattleWeaponParty,
	BattleWeaponOther,
	BattleWeaponEnemy,
	BattleWeaponItem,
	BattleWeaponAcMarioAc,
	BattleWeaponAcPartyAc,

	BattleAudienceKind,

	// this is the end of the actual file types and start of sub types
	TypeAmount,
	ListItem,
	
	HeartItem,
	
	MaplinkHeader,
}
