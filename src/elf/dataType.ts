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
	
	// registries
	CharacterNpc,
	CharacterMobj,
	CharacterParty,
	CharacterItem,
	CharacterAobj,
	
	MapId,
	ItemList,

	//parameters
	ParamPartyHint,
	ParamGobj,

	// this is the end of the actual file types and start of sub types
	TypeAmount,
	ListItem,

}
