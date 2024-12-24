export enum DataType {
	None,
	
	// map dispos
	Npc,
	Effect,
	Item,
	Mobj,
	Aobj,
	Bshape,
	
	// registries
	CharacterNpc,
	CharacterMobj,
	CharacterParty,
	CharacterItem,
	CharacterAobj,
	
	MapId,
	ItemList,
	DataEffect,
	
	// this is the end of the actual file types and start of sub types
	TypeAmount,
	ListItem,
}
