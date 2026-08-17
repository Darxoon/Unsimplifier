import { DataType } from "paper-mario-elfs/dataType";

const indexDataTypes: Set<DataType> = new Set([
	DataType.DataUi,
	DataType.ParamGobjItem,
])

/**
 * Whether a top-level data type has multiple root categories
 * (i.e. it requires an index editor which just contains links to different data types)
 */
export function isIndexDataType(dataType: DataType): boolean {
	return indexDataTypes.has(dataType)
}

const complexEditorCategories: {[dataType: number]: ComplexCategoryList} = {
	[DataType.DataUi]: {
		"Models": {
			dataType: DataType.UiModel,
		},
		"Messages": {
			dataType: DataType.UiMessage,
		},
		"Shops": {
			dataType: DataType.UiShop,
		},
		"Action Commands": {
			dataType: DataType.UiAcMaster,
		},
		"Gallery Art": {
			dataType: DataType.UiGalleryArt,
		},
		"Gallery Sound": {
			dataType: DataType.UiGallerySound,
		},
		"Icons": {
			dataType: DataType.UiIcon,
		},
		"Mail": {
			dataType: DataType.UiMail,
		},
		"World Map": {
			dataType: DataType.UiMap,
		},
		"Selection Boxes": {
			dataType: DataType.UiSelectWindow,
		},
		"Shine Sprites": {
			dataType: DataType.UiShine,
		},
		"Star Pieces": {
			dataType: DataType.UiStarpiece,
		},
		"Font Styles": {
			dataType: DataType.UiStyle,
		},
		"Merluvlee": {
			dataType: DataType.UiUranaisiNext,
		},
	},
	[DataType.ParamGobjItem]: {
		"Item Groups": {
			dataType: DataType.GobjItemGroup,
		},
		"Item Params": {
			dataType: DataType.GobjItemParam,
		},
	},
}

export type ComplexCategoryList = {[name: string]: { dataType: DataType, label?: string }}

export function getIndexChildTypes(dataType: DataType): ComplexCategoryList {
	return complexEditorCategories[dataType]
}
