import {define, css, html} from '@pucelle/flit'
import {List} from './list'
import {theme} from '../style/theme'


@define('f-navigation')
export class Navigation<T> extends List<T> {

	static style() {
		let {backgroundColor, adjust, adjustFontSize} = theme

		return css`
		:host{
			padding: ${adjust(8)}px ${adjust(16)}px;
			border-bottom: none;
			background: ${backgroundColor.toMiddle(9)};
			overflow-y: auto;
		}

		.title{
			font-size: ${adjustFontSize(18)}px;
			font-weight: 300;
			margin-top: ${adjust(4)}px;
			margin-bottom: ${adjust(8)}px;
		}

		`.extends(super.style())
	}

	type: 'selection' | 'navigation' = 'navigation'
	title: string = ''

	render() {
		return html`
		<tempalte>
			${this.title ? html`
			<div class="title">
				${this.title}
			</div>` : ''}

			${this.renderDataOrChildren(this.data)}
		</tempalte>`
	}
}