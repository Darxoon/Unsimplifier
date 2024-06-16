import type { DataType } from "paper-mario-elfs/dataType"
import type { ElfBinary } from "paper-mario-elfs/elfBinary"
import type { UuidTagged } from "paper-mario-elfs/valueIdentifier"

export interface CardList {
    type: "cardList"
    
    binary: ElfBinary
    dataType: DataType
    filePath?: string
    overrideObjects?: UuidTagged[]
}

export interface Docs {
    type: "docs"
}

export type PageContent = CardList | Docs
