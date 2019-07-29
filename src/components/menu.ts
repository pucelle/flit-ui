import {css, define, Component, html, on, getComponent, renderComplete, off, cache, render, getComponentAsync, show} from 'flit'
import {theme} from '../style/theme'
import {onceMouseLeaveAll, align, getPreviousVisibleElement, getNextVisibleElement} from 'ff'
import {Layer} from './layer'


interface MenuEvents {
	select: (item: MenuItem) => void
}

@define('f-menu')
export class Menu<Events = any> extends Component<Events & MenuEvents> {

	static style() {
		return css`
		:host{
			display: block;
		}
	`}

	static properties = ['selectable', 'dirSelectable']

	/** Can select bottom most item as current. */
	selectable: boolean = false

	/** Can select directory of items as current. */
	dirSelectable: boolean = false


	/** Relate with the `padding-left` of items */
	deep: number = 0

	/** If any direct items in it has icon */
	itemsHasIcon: boolean = false

	layer: Layer | null = null
	
	topMenu!: Menu

	protected selectedItem: MenuItem | null = null
	protected hoverItem: MenuItem | null = null
	protected openedSubMenus: SubMenu[] = []
	protected unwatchSubMenusLeave: (() => void) | null = null

	protected render() {
		return html`
		<template
			tabindex="0"
			@@focus=${this.onFocus}
			@@blur=${this.onBlur}
		>
			<slot />
		</template>
	`}
	
	protected onCreated() {
		this.topMenu = this
		this.layer = this.closest(Layer)

		if (this.layer && this.layer.popup) {
			this.initWhenInLayer()
		}
	}

	protected initWhenInLayer() {
		this.watch(() => this.layer!.popup!.opened, (opened) => {
			if (opened) {
				this.setHoverItem(null)
			}
			else {
				this.hideAllSubMenuLayers()
			}
		})
	}
	
	/** Called when child item or submenu selected. */
	selectItem(item: MenuItem) {
		if (this.selectable) {
			if (this.selectedItem) {
				this.selectedItem.selected = false
			}
			
			item.selected = true
			this.selectedItem = item
			this.emit('select', item)
		}

		this.setHoverItem(item)
	}

	mayHideLayer() {
		if (this.layer && this.layer.popup) {
			this.layer.popup.hideLayer()
		}
	}

	setHoverItem(item: MenuItem | null) {
		if (this.hoverItem) {
			this.hoverItem.hoverAt = false
		}
		
		this.hoverItem = item

		if (item) {
			item.hoverAt = true

			let siblingsMenuItems = ([...item.el.parentElement!.children] as HTMLElement[]).filter(el => el.localName === 'f-menuitem').map(getComponent) as MenuItem[]
			siblingsMenuItems.forEach(item => {
				if (item !== item && item.subMenu && item.subMenu.opened) {
					this.hideSubMenuLayer(item.subMenu)
				}
			})
		}
	}

	onSubMenuOpened(subMenu: SubMenu) {
		let oldOpenedSubMenus = this.openedSubMenus
		let newOpenedSubMenus = this.openedSubMenus = [subMenu]
		let parentSubMenu = subMenu.parentMenu

		while (parentSubMenu && (parentSubMenu instanceof SubMenu)) {
			newOpenedSubMenus.unshift(parentSubMenu)
			parentSubMenu = parentSubMenu.parentMenu
		}

		for (let oldSubMenu of oldOpenedSubMenus) {
			if (!newOpenedSubMenus.includes(oldSubMenu)) {
				oldSubMenu.hideLayer()
			}
		}

		let openedLayerEls = [this.layer!.el, ...newOpenedSubMenus.map(subMenu => subMenu.layer!.el)]
		if (this.unwatchSubMenusLeave) {
			this.unwatchSubMenusLeave()
		}
		this.unwatchSubMenusLeave = onceMouseLeaveAll(openedLayerEls, this.hideAllSubMenuLayers.bind(this))
	}

	protected hideAllSubMenuLayers() {
		for (let subMenu of this.openedSubMenus) {
			subMenu.hideLayer()
		}
		this.openedSubMenus = []
	}

	protected hideSubMenuLayer(subMenu: SubMenu) {
		let index = this.openedSubMenus.findIndex(menu => menu === subMenu)
		if (index > -1) {
			for (let subMenu of this.openedSubMenus.slice(index)) {
				subMenu.hideLayer()
			}
			
			this.openedSubMenus = this.openedSubMenus.slice(0, index)
		}
	}
	
	protected onFocus() {
		if (!this.layer && !this.hoverItem) {
			this.hoverOneItem()
		}
		
		on(document, 'keydown', this.onKeyDown as (e: Event) => void, this)
	}

	protected onKeyDown(e: KeyboardEvent) {
		let hoverItem = this.hoverItem
		if (!hoverItem) {
			if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
				e.preventDefault()
				this.hoverOneItem()
			}
			return
		}

		if (e.key === 'Enter') {
			e.preventDefault()
			
			if (this.layer && hoverItem.subMenu) {
				if (hoverItem.subMenu.opened) {
					hoverItem.subMenu.hideLayer()
				}
				else {
					hoverItem.subMenu.showInLayer()
				}
			}
			else {
				hoverItem.click()
				
				if (this.layer) {
					this.layer.popup!.hideLayer()
				}
			}
		}
		else if (e.key === 'ArrowLeft') {
			e.preventDefault()

			if (this.layer && hoverItem.parentMenu && (hoverItem.parentMenu instanceof SubMenu) && hoverItem.parentMenu.parentMenu) {
				hoverItem.parentMenu.parentMenu.hoverOneItem()
			}
		}
		else if (e.key === 'ArrowRight') {
			e.preventDefault()

			if (this.layer && hoverItem.subMenu) {
				if (hoverItem.subMenu.opened) {
					hoverItem.subMenu.hoverOneItem()
				}
				else {
					hoverItem.subMenu.showInLayer()
				}
			}
		}
		else if (e.key === 'ArrowUp') {
			e.preventDefault()
			this.hoverPreviousItem()
		}
		else if (e.key === 'ArrowDown') {
			e.preventDefault()
			this.hoverNextItem()
		}
		else if (e.key === 'Escape') {
			e.preventDefault()

			if (this.layer) {
				this.layer.popup!.hideLayer()
			}
		}
	}

	protected hoverPreviousItem() {
		let prev: HTMLElement | null = this.hoverItem!.el
		
		do {
			prev = getPreviousVisibleElement(prev, this.el) as HTMLElement | null
		}
		while (prev && !(getComponent(prev) instanceof MenuItem))

		if (prev) {
			this.setHoverItem(getComponent(prev) as MenuItem)
		}
	}

	protected hoverNextItem() {
		let next: HTMLElement | null = this.hoverItem!.el
		do {
			next = getNextVisibleElement(next, this.el) as HTMLElement | null
		}
		while (next && !(getComponent(next) instanceof MenuItem))

		if (next) {
			this.setHoverItem(getComponent(next) as MenuItem)
		}
	}

	hoverOneItem() {
		let items = ([...this.el.children] as HTMLElement[]).map(getComponent).filter(com => com instanceof MenuItem) as MenuItem[]
		let item = items.find(item => !!item.subMenu && item.subMenu.opened)

		if (!item) {
			item = items.find(item => item.selected)
		}

		if (!item) {
			item = items[0]
		}
		
		if (item) {
			this.setHoverItem(item)
		}
	}

	protected onBlur() {
		this.setHoverItem(null)
		off(document, 'keydown', this.onKeyDown as (e: Event) => void, this)
	}
}


@define('f-menuitem')
export class MenuItem<Events = any> extends Component<Events> {

	static style() {
		let {lh, mainColor} = theme

		return css`
		:host{
			display: block;
			position: relative;
			display: flex;
			cursor: pointer;
			padding: 0 ${lh(10)}px;

			&.hover{
				background: #eee;
			}

			&.submenu-opened{
				color: ${mainColor};
				background: ${mainColor.alpha(0.05)};

				&.hover{
					background: ${mainColor.alpha(0.1)};
				}
			}

			&.selected{
				color: ${mainColor};
				background: ${mainColor.alpha(0.1)};

				&.hover{
					background: ${mainColor.alpha(0.15)};
				}
			}
		}

		// If at least one item in menu has icon, but current one not,
		// still need an element to place.
		.icon-place{
			display: flex;
			width: ${lh(30)}px;
			margin-right: ${lh(-10)}px;

			f-icon{
				margin: auto;
			}
		}

		.arrow{
			margin-left: auto;
			margin-right: 0;
		}

		.text{
			flex: 1;
			padding: 0 ${lh(10)}px;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}
	`}

	static properties = ['icon', 'selected']

	icon: string = ''
	selected: boolean = false
	
	hoverAt: boolean = false
	parentMenu!: Menu | SubMenu
	topMenu!: Menu
	subMenu: SubMenu | null = null

	protected render() {
		let parentMenu = this.parentMenu
		let topMenu = this.topMenu
		let subMenu = this.subMenu
		
		let icon = parentMenu.itemsHasIcon ? html`
			<div class="icon-place">
				${this.icon ? html`<f-icon .type=${this.icon} />` : ''}
			</div>
		` : ''

		let rightIcon: any = ''
		if (subMenu) {
			let rightIconType = topMenu.layer
				? 'right' : subMenu.opened
				? 'up' : 'down'
			
			rightIcon = html`<f-icon class="arrow" .type=${rightIconType} />`
		}

		let iconSize = theme.lh(25)

		return html`
			<template
				:class.selected=${this.selected}
				:class.hover=${this.hoverAt}
				:class.submenu-opened=${topMenu.layer && subMenu && subMenu.opened}
				:style.padding-left.px=${topMenu.layer ? '' : parentMenu.itemsHasIcon ? parentMenu.deep * iconSize + 5 : parentMenu.deep * iconSize}
				@@click=${this.onClick}
				@@mouseenter=${this.onMouseEnter}
			>
				${icon}
				<span class="text">
					<slot></slot>
				</span>
				${rightIcon}
			</template>
		`
	}

	protected async onCreated() {
		this.parentMenu = this.closest(SubMenu) || this.closest(Menu)!
		if (!this.parentMenu) {
			throw new Error(`"<f-menuitem>" must be contained in a "<f-menu>"`)
		}

		this.parentMenu.itemsHasIcon = this.parentMenu.itemsHasIcon || !!this.icon
		this.topMenu = this.parentMenu instanceof Menu ? this.parentMenu : this.parentMenu.topMenu

		if (this.selected) {
			this.topMenu.selectItem(this)
		}

		let nextEl = this.el.nextElementSibling
		if (nextEl && nextEl.localName === 'f-submenu') {
			this.subMenu = await getComponentAsync(nextEl as HTMLElement) as SubMenu
		}
	}

	protected onClick() {
		this.click()
	}

	click() {
		if (this.subMenu) {
			// Can select current item as an directory
			if (this.topMenu.selectable && this.topMenu.dirSelectable) {
				this.topMenu.selectItem(this)
			}

			// Otherwise it been controlled by registered 'mouseenter' event.
			if (!this.topMenu.layer) {
				this.subMenu.opened = !this.subMenu.opened
			}
		}
		else {
			this.topMenu.selectItem(this)
		}

		this.topMenu.mayHideLayer()
	}

	protected onMouseEnter() {
		this.topMenu.setHoverItem(this)
	}
}


@define('f-menuspliter')
export class MenuSpliter<Events = any> extends Component<Events> {
	static style = css`
	:host{
		background-color: #eee;
		background-clip: content-box;
		height: 1px;
	}`
}


@define('f-submenu')
export class SubMenu<Events = any> extends Component<Events> {

	static style() {
		let {lh, fs} = theme

		return css`
		:host{
			display: block;
			overflow: hidden; // To play 'height' transition
		}
		
		.layer{
			padding: 5px 0;
			font-size: ${fs(12)}px;

			f-menuitem{
				padding: 0 ${lh(7)}px;
			}
		}
	`}

	opened: boolean = false
	deep: number = 1
	itemsHasIcon: boolean = false
	parentMenu!: Menu | SubMenu
	topMenu!: Menu
	layer: Layer | null = null

	protected menuItem!: MenuItem

	protected render() {
		return html`
		<template
			${show(
				this.topMenu.layer ? true : this.opened,
				this.topMenu.layer ? undefined : {transition: {properties: ['height', 'opacity']}}
			)}
			:class.has-icon="${this.itemsHasIcon}"
		>
			<slot></slot>
		</template>
	`}

	protected onCreated() {
		this.parentMenu = this.closest(SubMenu) || this.closest(Menu)!
		if (!this.parentMenu) {
			throw new Error(`"<f-submenu>" must be contained in a "<f-menu>"`)
		}
		this.topMenu = this.parentMenu instanceof Menu ? this.parentMenu : this.parentMenu.topMenu
		this.deep = this.parentMenu.deep + 1

		let menuItem = getComponent(this.el.previousElementSibling as HTMLElement)
		if (menuItem && (menuItem instanceof MenuItem)) {
			this.menuItem = menuItem
		}
		else {
			throw new Error(`"<f-submenu>" must after "<f-menuitem>"`)
		}

		if (this.topMenu.layer) {
			this.initWhenInLayer()
		}
	}

	protected initWhenInLayer() {
		this.el.remove()
		on(this.menuItem.el, 'mouseenter', this.showInLayer, this)
	}

	async showInLayer() {
		// If already opened and mouseenter, reset all opened submenus.
		if (this.opened) {
			this.topMenu.onSubMenuOpened(this)
		}
		else {
			this.opened = true

			if (this.layer) {
				// Must insert into document, or the watcher will be disconnected since current menu in it is not in document.
				document.body.append(this.layer.el)
				this.topMenu.onSubMenuOpened(this)
			}
			else {
				let fragment = render(() => {
					return cache(
						this.opened ? html`<f-layer class="layer" .trangle=${false} :ref=${this.onRefLayer} />` : '',
						{enterAtStart: true, transition: 'fade'}
					)
				}, this)

				document.body.append(fragment)
			}
		}
	}

	protected async onRefLayer(layerEl: HTMLElement) {
		layerEl.append(this.el)
		await renderComplete()
		this.layer = getComponent(layerEl) as Layer
		align(this.layer!.el, this.menuItem.el, 'rt', {margin: [5, 0]})
		this.topMenu.onSubMenuOpened(this)
	}

	hideLayer() {
		this.opened = false
	}

	hoverOneItem() {
		Menu.prototype.hoverOneItem.call(this)
	}
}
