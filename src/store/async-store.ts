import {Emitter} from '@pucelle/ff'
import {LiveAsyncRepeatDirective} from '@pucelle/flit'


export interface AsyncStoreEvents {
	change: () => void
}


/**
 * Compare to `Store`, `AsyncStore` loads data for one page each time.
 * And every time after data changed, it refreshs to reload all datas.
 * It's an extension for `liveRepeat` directive, to cache data,
 * you should extends this class and overwrite abstract methods, and may support like column ordering and searching.
 */
export abstract class AsyncStore<Item = any> extends Emitter<AsyncStoreEvents> {

	private repeatDir!: LiveAsyncRepeatDirective<Item>

	key: string = ''
	orderKey: string = ''
	orderDirection: 'asc' | 'desc' | '' = ''

	abstract dataCount(): Promise<number> | number
	abstract dataGetter(start: number, size: number): Promise<Iterable<Item>> | Iterable<Item>

	setRepeatDirective(dir: LiveAsyncRepeatDirective<Item>) {
		this.repeatDir = dir
	}
	
	reset(startIndex: number = 0) {
		if (this.repeatDir) {
			this.repeatDir.reset(startIndex)
		}
		this.emit('change')
	}

	reload() {
		if (this.repeatDir) {
			this.repeatDir.reload()
		}

		this.emit('change')
	}

	setOrder(key: string, direction: 'asc' | 'desc' | '') {
		this.orderKey = key
		this.orderDirection = direction
		this.reload()
	}

	clearOrder() {
		this.orderKey = ''
		this.orderDirection = ''
		this.reload()
	}

	getFirstVisibleIndex() {
		return this.repeatDir.getFirstVisibleIndex()
	}
}