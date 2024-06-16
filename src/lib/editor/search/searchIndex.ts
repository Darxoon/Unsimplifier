import type { UuidTagged } from "paper-mario-elfs/valueIdentifier";

export interface IndexValue {
    obj: UuidTagged,
    field: string,
    value: string,
}

export type SearchIndex = IndexValue[]
