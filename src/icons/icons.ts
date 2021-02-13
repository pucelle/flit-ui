///<reference types="@pucelle/webpack-svg-loader" />


import checkboxChecked from './icons/checkbox-checked.svg'
import checkboxIndeterminate from './icons/checkbox-indeterminate.svg'
import checkboxUnchecked from './icons/checkbox-unchecked.svg'
import checked from './icons/checked.svg'
import close from './icons/close.svg'
import confirm from './icons/confirm.svg'
import down from './icons/down.svg'
import error from './icons/error.svg'
import info from './icons/info.svg'
import love from './icons/love.svg'
import orderAsc from './icons/order-asc.svg'
import orderDefault from './icons/order-default.svg'
import orderDesc from './icons/order-desc.svg'
import radioChecked from './icons/radio-checked.svg'
import radioUnchecked from './icons/radio-unchecked.svg'
import right from './icons/right.svg'
import search from './icons/search.svg'
import success from './icons/success.svg'
import tips from './icons/tips.svg'
import triangleDown from './icons/triangle-down.svg'
import triangleRight from './icons/triangle-right.svg'
import warning from './icons/warning.svg'
import refresh from './icons/refresh.svg'


class SVGIcons {

	/** Map of `id -> code`. */
	private readonly map: Map<string, string> = new Map()

	/** Get all icon ids. */
	getAllIds() {
		return this.map.keys()
	}

	/** Add imported icon items. */
	add(...items: {id: string, code: string}[]) {
		for (let {id, code} of items) {
			this.map.set(id, code)
		}
	}
	
	/** Get svg icon code by id. */
	get(id: string) {
		return this.map.get(id)
	}

	/** Delete svg icon by id. */
	delete(id: string) {
		return this.map.delete(id)!
	}
}

/** 
 * Global icon cache object to provide types for `<f-icon />`.
 * You may append more icons from `icons.add(...)`.
 */
export const icons = new SVGIcons()

icons.add(
	checkboxChecked,
	checkboxIndeterminate,
	checkboxUnchecked,
	checked,
	close,
	confirm,
	down,
	error,
	info,
	love,
	orderAsc,
	orderDefault,
	orderDesc,
	radioChecked,
	radioUnchecked,
	right,
	search,
	success,
	tips,
	triangleDown,
	triangleRight,
	warning,
	refresh,
)