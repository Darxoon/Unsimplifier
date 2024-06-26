export {}

declare global {
	interface Array<T> {
	  findLast(
		predicate: (value: T, index: number, obj: T[]) => unknown,
		thisArg?: any
	  ): T
	  
	  findLastIndex(
		predicate: (value: T, index: number, obj: T[]) => unknown,
		thisArg?: any
	  ): number
	}
	
	interface FocusOptions {
		focusVisible?: boolean
	}
	
	interface Storage {
		setItem(key: string, value: number): void;
	}
}
