import {define, Component, TemplateResult, on, off, cache, DirectiveResult} from '@pucelle/flit'


/** Match parameters by matching current path with router. */
export interface RouteMatchResult {

	/** Router parameters, router `/user/:id` match `/user:12345` will get `{id: 12345}`. */
	params: Record<string, string>

	/** Router catprues, router `/\/user\/(\d+)/` match `/user:12345` will get `[12345]`. */
	captures: string[]
}

export interface RouteOptions {

	/** If provided, will update `document.title` if associated route path matcher. */
	title?: string

	/** If provided as `true`, Will cache the rendered components even not match router. */
	cache?: boolean
}

export interface RouterEvents {

	/** Triggers after router changed and pushed new state, components are not updated yet. */
	goto: (newPath: string, oldPath: string, asPopup: boolean) => void

	/** Triggers after router changed and replace current state, components are not updated yet. */
	redirectTo: (oldPpath: string, oldPath: string, asPopup: boolean) => void

	/** Triggers after router changed and replace current state, components are not updated yet. */
	goOrRedirectTo: (oldPpath: string, oldPath: string, asPopup: boolean) => void
}

/** Current history state. */
interface RouterHistoryState {
	path: string
	asPopupPath: boolean
}


/** 
 * `<f-router>` can be used as a top container to contains everything that should be routed, 
 * Which means choose to be rendered depends on whether current path match.
 * You will need initialize start path by `this.goto(this.getUnPrefixedPath(location.pathname))`.
 * 
 * ```ts
 * render() {
 *     this.route('/user:id', ({id}) => {
 *         return html`User Id: ${id}`
 *     })
 * }
 * ```
 */
@define('f-router')
export class Router<E = any> extends Component<RouterEvents & E> {

	/** A prefix will be added to current location, but will be removed from router path. */
	prefix: string = ''

	/** Current path, no matter normal path or popup path. */
	path: string = ''

	/** Normal not popup type path. */
	protected normalPath: string = ''

	/** Popup path come from `goto(..., true)`. */
	protected popupPath: string | null = null

	/** Current history state */
	protected state: RouterHistoryState | null = null

	/** Stacked popup count. */
	protected stackedPopupCount: number = 0

	protected onCreated() {
		on(window, 'popstate', this.onWindowStateChange as (e: Event) => void, this)
	}

	/** Get relative path for router from a uri. */
	protected getPathFromUri(uri: string): string {
		let path = new URL(uri).pathname
		return this.getUnPrefixedPath(path)
	}

	/** Get relative path for router from a uri. */
	protected getUnPrefixedPath(path: string): string {
		if (this.prefix && path.startsWith(this.prefix)) {
			path = path.slice(this.prefix.length)
		}

		if (!path) {
			path = '/'
		}

		return path
	}

	protected onDisconnected() {
		off(window, 'popstate', this.onWindowStateChange as (e: Event) => void, this)
	}

	private onWindowStateChange(e: PopStateEvent) {
		if (e.state) {
			if (this.state?.asPopupPath) {
				this.stackedPopupCount--
			}

			this.redirectTo(e.state.path, e.state.asPopupPath)
		}
	}

	/** 
	 * Used in a `render()` function, render it if route path match.
	 * `renderFn` recvives `{id: 12345}` for router path `/user/:id`.
	 */
	route(routePath: string, renderFn: (params: Record<string, string>) => '' | TemplateResult, options?: RouteOptions): '' | TemplateResult | DirectiveResult
	
	/** 
	 * Used in a `render()` function, render it if route path match.
	 * `renderFn` recvives `[12345]` for router path `/\/user\/(\d+)/`.
	 */
	route(routePath: RegExp, renderFn: (captures: string[]) => '' | TemplateResult, options?: RouteOptions): '' | TemplateResult | DirectiveResult

	route(routePath: string | RegExp, renderFn: any, options: RouteOptions = {}): '' | TemplateResult | DirectiveResult {
		let result: '' | TemplateResult

		if (this.isMatch(routePath)) {
			if (options.title) {
				document.title = options.title
			}

			let matchResult = this.matchPath(routePath)

			if (routePath instanceof RegExp) {
				result = renderFn(matchResult?.captures)
			}
			else {
				result = renderFn(matchResult?.params)
			}

		}
		else {
			result = ''
		}

		if (options.cache) {
			return cache(result)
		}
		else {
			return result
		}
	}

	/** Returns whether current path matches router path. */
	isMatch(routePath: string | RegExp): boolean {
		return PathParser.isMatch(this.normalPath, routePath)
			|| !!(this.popupPath && PathParser.isMatch(this.popupPath, routePath))
	}

	/** Returns whether specified path matches router path. */
	isPathMatch(path: string, routePath: string | RegExp): boolean {
		return PathParser.isMatch(path, routePath)
	}

	/** Match current path with router path, returns match parameters and captures. */
	protected matchPath(routePath: string | RegExp): {params: Record<string, string>, captures: string[]} | null {
		if (PathParser.isMatch(this.normalPath, routePath)) {
			return PathParser.matchPath(this.normalPath, routePath)
		}
		else if (this.popupPath && PathParser.isMatch(this.popupPath, routePath)) {
			return PathParser.matchPath(this.popupPath, routePath)
		}
		else {
			return null
		}
	}

	/**
	 * Goto a new path and update render result, add a history state.
	 * If `asPopupPath` is `true`, can update current path and also keep last rendering.
	 */
	goto(path: string, asPopupPath: boolean = false) {
		if (path === this.path) {
			return
		}

		if (asPopupPath) {
			this.popupPath = path
			this.stackedPopupCount++
		}
		else {
			this.clearPopupStack()
			this.normalPath = path
		}

		let oldPath = this.path
		let uri = this.getURIFromPath(path)

		this.path = path
		this.state = {path, asPopupPath}
		history.pushState(this.state, '', uri)

		this.emit('goto', path, oldPath, asPopupPath)
		this.emit('goOrRedirectTo', path, oldPath, asPopupPath)
	}

	/** 
	 * Redirect to a new path and update render result, replace current history state.
	 * If `asPopupPath` is `true`, can update current path and also keep last rendering.
	 */
	redirectTo(path: string, asPopupPath: boolean = false) {
		if (path === this.path) {
			return
		}

		if (asPopupPath) {
			this.popupPath = path
		}
		else {
			this.clearPopupStack()
			this.normalPath = path
		}

		let oldPath = this.path
		let uri = this.getURIFromPath(path)

		this.path = path
		this.state = {path, asPopupPath}
		history.replaceState(this.state, '', uri)

		this.emit('redirectTo', path, oldPath, asPopupPath)
		this.emit('goOrRedirectTo', path, oldPath, asPopupPath)
	}

	/** 
	 * Clear all popup states and pop last non-popup state.
	 * Must call before set current path.
	 */
	clearPopupStack() {
		if (this.stackedPopupCount > 0) {
			history.go(-this.stackedPopupCount)
		}

		this.stackedPopupCount = 0
		this.popupPath = null
	}

	/** Get whole url. */
	private getURIFromPath(path: string): string {
		if (!path) {
			path = '/'
		}

		if (this.prefix) {
			path = this.prefix + path
		}

		return path
	}
}


namespace PathParser {

	const pathParsedResultMap: Map<string, {re: RegExp, keys: string[]}> = new Map()

	export function isMatch(path: string, routePath: string | RegExp): boolean {
		let re: RegExp

		if (typeof routePath === 'string') {
			re = ensureParsedResult(routePath).re
		}
		else {
			re = routePath
		}

		return re.test(path)
	}

	function ensureParsedResult(routePath: string): {re: RegExp, keys: string[]} {
		if (pathParsedResultMap.has(routePath)) {
			return pathParsedResultMap.get(routePath)!
		}
		else {
			return parsePath(routePath)
		}
	}

	export function matchPath(path: string, routePath: string | RegExp): {params: Record<string, string>, captures: string[]} | null {
		let params: Record<string, string> = {}
		let captures: string[] = []

		if (typeof routePath === 'string') {
			let {re, keys} = ensureParsedResult(routePath)
			let m = path.match(re)
			if (!m) {
				return null
			}

			if (keys) {
				for (let i = 0; i < keys.length; i++) {
					let key = keys[i]
					params[key] = m[i + 1]
				}
			}
		}
		else {
			let m = path.match(routePath)
			if (!m) {
				return null
			}

			captures = [...m]
		}

		return {
			params,
			captures,
		}
	}

	function parsePath(routePath: string): {re: RegExp, keys: string[]} {
		let keys: string[] = []

		let re = new RegExp(
			routePath
			.replace(/\./g, '\\.')
			.replace(/\*/g, '.*?')
			.replace(/(\/):(\w+)/g, function (_m0, slash, property) {
				if (property) {
					(keys as string[]).push(property)
				}
				return slash + '([\\w-]+)'
			})
			.replace(/^/, '^')
			.replace(/$/, '$'),
		'i')
		
		let parsed = {re, keys}
		pathParsedResultMap.set(routePath, parsed)

		return parsed
	}
}
