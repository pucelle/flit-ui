import {css, define, html, Component, repeat, renderComponent} from 'flit'
import {theme} from '../style/theme'
import {remove, Timeout, timeout} from 'ff'
import {Color} from '../style/color'


export type NotificationType = 'info' | 'success' | 'alert'

export interface NotificationOptions {
	id?: number
	type?: NotificationType
	title?: string
	content?: string
	buttons?: {[key: string]: string}
	hideDelay?: number
	callback?: (btn: string) => void
}

export interface NotificationItem extends NotificationOptions {
	id: number
	entered: boolean
	timeout: Timeout | null
}

export interface NotificationOptions {
	unique?: boolean
}


@define('f-notification-tips')
export class NotificationTips<Events = any> extends Component<Events> {
	static style() {
		let {infoColor, lh, successColor, errorColor, layerBorderRadius, layerShadowBlurRadius, fs, backgroundColor, textColor, layerShadowColor} = theme

		return css`
		:host{
			position: fixed;
			right: 10px;
			bottom: 10px;
			max-width: 300px;
			z-index: 1300;	// Higher than content
			font-size: ${fs(12)}px;
		}

		.item{
			position: relative;
			display: flex;
			margin-top: 10px;
			background: ${backgroundColor};
			box-shadow: 0 0 ${layerShadowBlurRadius}px ${layerShadowColor};
			cursor: pointer;
			overflow: hidden;
			border-radius: ${layerBorderRadius}px;
		}

		.close{
			position: absolute;
			right: 5px;
			top: 5px;
			display: flex;
			width: 30px;
			height: 30px;
			color: ${textColor};

			f-icon{
				margin: auto;
			}

			&:hover{
				color: ${textColor.highlight(10)};
			}

			&:active{
				transform: translateY(1px);
			}
		}

		.left{
			padding: ${lh(10)}px;
		}

		.icon{
			display: block;
			width: ${lh(20)}px;
			height: ${lh(20)}px;
			color: #fff;

			svg{
				width: ${lh(20)}px;
				height: ${lh(20)}px;
			}
		}

		.right{
			flex: 1;
			min-width: 0;
			padding: ${lh(10)}px;
			padding-right: ${lh(40)}px;
		}

		.head{
			font-weight: bold;
			line-height: ${lh(20)}px;
			margin-bottom: ${lh(4)}px;
		}

		.body{
			flex: 1;
			min-width: 0;
			line-height: ${lh(20)}px;
			text-align: left;
			word-wrap: break-word;

			a{
				font-weight: bold;
			}
		}

		.buttons{
			display: flex;
			margin-top: ${lh(8)}px;
		}

		
		button{
			height: ${lh(24)}px;
			line-height: ${lh(24) - 2}px;
			margin-right: ${lh(8)}px;
			padding: 0 ${lh(12)}px;
		}

		${
			([
				['alert', errorColor],
				['info', infoColor],
				['success', successColor]
			] as [string, Color][]
			).map(([type, color]) => css`
			.type-${type}{
				&:hover{
					background: ${color.mix(backgroundColor, 95)};
				}

				.left{
					background: ${color};
				}
			}`.toString()).join('')
		}
		`
	}
	
	hideDelay: number = 5000
	appendTo: string | HTMLElement | null = 'body'

	protected seed: number = 1
	protected items: NotificationItem[] = []

	protected render() {
		return repeat(this.items, (item) => 
			html`<div class="item"
				:class="type-${item.type}"
				@mouseenter=${() => this.onMouseEnter(item)}
				@mouseleave=${() => this.onMouseLeave(item)}
			>
				<div class="close" @click=${() => this.onClickClose(item)}>
					<f-icon type="close" />
				</div>
				<div class="left">
					<f-icon class="icon" .type=${item.type} />
				</div>
				<div class="right">
					${item.title ? html`<div class="head">${item.title}</div>` : ''}
					<div class="body" :html=${item.content}></div>
					
					${item.buttons ? html`
					<div class="buttons">
						${Object.entries(item.buttons).map(([btn, text]) => html`
							<button @click=${() => this.onClickBtn(item, btn)}>
								${text}
							</button>`
						)}
					</div>` : ''}
				</div>
			</div>`
		, {transition: 'fade', enterAtStart: true, onend: this.onTransitionEnd})
	}

	protected onMouseEnter(item: NotificationItem) {
		item.entered = true
	}

	protected onMouseLeave(item: NotificationItem) {
		item.entered = false

		if (!item.timeout) {
			this.hideLater(item)
		}
	}

	protected onClickClose(item: NotificationItem) {
		remove(this.items, item)
	}

	protected onClickBtn(item: NotificationItem, btn: string) {
		if (item.callback) {
			item.callback(btn)
		}
	}

	protected onTransitionEnd(type: string) {
		if (type === 'leave' && this.items.length === 0) {
			this.el.remove()
		}
	}

	showNotification(options: NotificationOptions): number {
		if (options.id) {
			let item = this.items.find(v => v.id === options.id)
			if (item) {
				delete item.hideDelay
				Object.assign(item, options)
				this.hideLater(item)
				return options.id
			}
		}

		let item = Object.assign({
			id: this.seed++,
			entered: false,
			timeout: null
		}, options)
		
		this.items.unshift(item)
		this.hideLater(item)

		if (this.items.length === 1) {
			document.body.append(this.el)
		}

		return item.id
	}

	protected hideLater(item: NotificationItem) {
		if (item.timeout) {
			item.timeout.cancel()
		}

		item.timeout = timeout(() => {
			item.timeout = null

			if (!item.entered) {
				this.hide(item.id)
			}
		}, item.hideDelay || this.hideDelay)
	}

	hide(id: number): boolean {
		let item = this.items.find(v => v.id === id)
		if (item) {
			remove(this.items, item)
			return true
		}
		else {
			return false
		}
	}

	hideAll() {
		this.items = []

		if (this.items.length === 0) {
			this.el.remove()
		}
	}
}


export class Notification {

	protected tips: NotificationTips | null = null

	unique() {
		return new UniqueNotification(this)
	}

	showNotification(options: NotificationOptions): number {
		if (!this.tips) {
			this.tips = renderComponent(html`<f-notification-tips />`).component as NotificationTips
		}

		return this.tips!.showNotification(options)
	}

	info(content: string, options: NotificationOptions = {}): number {
		options.type = 'info'
		options.content = content

		return this.showNotification(options)
	}

	alert(content: string, options: NotificationOptions = {}): number {
		options.type = 'alert'
		options.content = content

		return this.showNotification(options)
	}

	success(content: string, options: NotificationOptions = {}): number {
		options.type = 'success'
		options.content = content

		return this.showNotification(options)
	}
}


export class UniqueNotification {

	raw: Notification
	id: number | null = null

	constructor(raw: Notification) {
		this.raw = raw
	}

	private overwriteOptions(options: NotificationOptions) {
		if (this.id) {
			options.id = this.id
		}
	}

	showNotification(options: NotificationOptions): number {
		this.overwriteOptions(options)
		return this.id = this.raw.showNotification(options)
	}

	info(content: string, options: NotificationOptions = {}): number {
		this.overwriteOptions(options)
		return this.raw.info(content, options)
	}

	alert(content: string, options: NotificationOptions = {}): number {
		this.overwriteOptions(options)
		return this.raw.alert(content, options)
	}

	success(content: string, options: NotificationOptions = {}): number {
		this.overwriteOptions(options)
		return this.raw.success(content, options)
	}
}

export const notification = new Notification()