import {defineBinding, Context, on, off, renderComplete, Transition, Binding, once, BindingResult, getRenderedAsComponent, renderUpdatable} from '@pucelle/flit'
import {alignToEvent, watchLayout, MouseLeave} from '@pucelle/ff'
import {ContextMenu} from '../components/contextmenu'
import {RenderFn} from '../types'


export class ContextMenuBinding implements Binding<RenderFn> {

	protected readonly el: HTMLElement
	protected readonly context: Context

	protected renderFn!: RenderFn
	protected popup: ContextMenu | null = null
	protected unwatchRect: (() => void) | null = null
	protected unkeepEl: (() => void) | null = null

	constructor(el: Element, context: Context) {
		this.el = el as HTMLElement
		this.context = context
		on(this.el, 'contextmenu.prevent', this.showMenu, this)
	}

	update(renderFn: RenderFn) {
		this.renderFn = renderFn
	}

	protected async showMenu(e: Event) {
		this.renderPopup()
		let popup = this.popup!

		await renderComplete()

		// Align and get focus.
		alignToEvent(popup.el, e as MouseEvent)
		popup.el.focus()

		// Makesure mouse enter to submenu doesn't cause contextmenu hidden.
		this.unkeepEl = MouseLeave.keep(this.el)

		// Play enter transition.
		new Transition(popup.el, {name: 'fade'}).enter()

		// Register events to show or hide.
		on(document, 'mousedown', this.onDocMouseDown, this)
		once(popup.el, 'click', this.hideContextMenu, this)

		// Watch layout and re-render if layout changed.
		this.unwatchRect = watchLayout(this.el, 'rect', this.onElRectChanged.bind(this))
	}

	protected renderPopup()  {
		if (!this.popup) {
			this.popup = getRenderedAsComponent(renderUpdatable(this.renderFn, this.context).template) as ContextMenu
		}

		this.popup.applyAppendTo()
	}

	protected onDocMouseDown(e: Event) {
		let target = e.target as Element

		// If mouse down at document but not popup.
		if (this.popup && !this.popup.el.contains(target)) {
			this.hideContextMenu()
		}
	}

	protected hideContextMenu() {
		if (this.popup) {
			off(document, 'mousedown', this.onDocMouseDown, this)
			off(this.popup.el, 'click', this.hideContextMenu, this)

			new Transition(this.popup.el, {name: 'fade'}).leave().then((finish: boolean) => {
				if (finish) {
					this.onLeaveTransitionEnd()
				}
			})
		}

		// Not keep visible, may hide immediately.
		if (this.unkeepEl) {
			this.unkeepEl()
			this.unkeepEl = null
		}

		if (this.unwatchRect) {
			this.unwatchRect()
			this.unwatchRect = null
		}
	}

	protected onLeaveTransitionEnd() {
		if (this.popup) {
			this.popup.el.remove()
			this.popup = null
		}
	}

	protected onElRectChanged() {
		this.hideContextMenu()
	}

	remove() {
		off(this.el, 'contextmenu', this.showMenu, this)
	}
}


/** 
 * Popup a contextmenu when right click binded element.
 * @param renderFn Should returns a `<f-contextmenu />` template result.
 */
export const contextmenu = defineBinding('contextmenu', ContextMenuBinding) as (renderFn: RenderFn) => BindingResult