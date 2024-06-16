import type { Tab } from "./globalDragging";
import type { PageContent } from "./fileEditor/page";

export class OpenWindowEvent {
	title: string
	content: PageContent
	isCompressed: boolean
	
	/**
	 * Meant to be set by the EditorWindow where the event inevitably goes through.
	 */
	parentTab?: Tab
	
	constructor(title: string, isCompressed: boolean, content: PageContent) {
		this.title = title
		this.content = content
		this.isCompressed = isCompressed
	}
}