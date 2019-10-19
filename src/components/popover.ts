import {css, define, html} from '@pucelle/flit'
import {theme} from '../style/theme'
import {Popup} from './popup'
import {PopupOptions} from '../bindings/popup'
import {Action, ContextHasActions, renderActions} from './action'



// Compare to `<popup>`, it can set title and actions.
@define('f-popover')
export class Popover<E = any> extends Popup<E> implements ContextHasActions {

	static style() {
		let {adjust, adjustFontSize, textColor} = theme

		return css`
		:host{
			padding: ${adjust(8)}px ${adjust(16)}px;
			min-width: ${adjust(240)}px;
			max-width: ${adjust(400)}px;
		}

		.trangle{
			left: ${adjust(12)}px;
		}

		.header{
			display: flex;
			line-height: ${adjust(22)}px;
			height: ${adjust(28) + 1}px;
			font-size: ${adjustFontSize(13)}px;
			padding-bottom: ${adjust(6)}px;
			border-bottom: 1px solid ${textColor.alpha(0.8)};
			margin-bottom: ${adjust(8)}px;
		}

		.title{
			flex: 1;
			min-width: 0;
			font-weight: bold;
			overflow: hidden;
			white-space: nowrap;
			text-overflow: ellipsis;
		}

		.close{
			display: flex;
			width: ${adjust(28)}px;
			height: ${adjust(28)}px;
			margin-top: ${adjust(-6)}px;
			margin-right: ${adjust(-9)}px;
			cursor: pointer;

			&:active{
				transform: translateY(1px);
			}

			f-icon{
				margin: auto;
			}
		}

		.actions{
			margin-left: ${adjust(15)}px;
		}

		.action{
			margin-left: ${adjust(6)}px;
			height: ${adjust(22)}px;
			line-height: ${20}px;
			padding: 0 ${adjust(8)}px;
		}

		.content{}
		`.extends(super.style())
	}

	title: string = ''
	closable: boolean = false
	actions: Action[] | null = null

	defaultPopupOptions: PopupOptions = {
		// `trigger` not work here because when handle it, current component is not created.
		trigger: 'click',
		alignPosition: 'bc',
		fixTrangle: true,
	}

	protected render() {
		return html`
		<f-popup>	
			${this.renderHead()}
			<div class="content"><slot /></div>
		</f-popup>
		`.extends(super.render())
	}

	protected renderHead() {
		if (this.title) {
			let shouldRenderClose = this.closable && (!this.actions || this.actions.length === 0)

			return html`
			<div class="header">
				<div class="title">${this.title}</div>
				${renderActions(this, this.actions)}

				${shouldRenderClose ? html`
					<div class="close" @click=${this.close}>
						<f-icon .type="close" />
					</div>
				` : ''}
			</div>
			`
		}

		return ''
	}

	onActionHandled(_action: Action, success: boolean) {
		if (success) {
			this.close()
		}
	}
}
