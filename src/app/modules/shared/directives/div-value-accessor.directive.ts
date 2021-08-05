import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { Directive, forwardRef, ElementRef, Renderer2 } from '@angular/core';

@Directive({
	selector: 'div[formControlName]',
	host: {
			'(input)': 'onChange($event.target)',
			'(blur)' : 'onTouched()'
	},
	providers: [{
		provide: NG_VALUE_ACCESSOR,
		useExisting: forwardRef(() => DivValueAccessorDirective),
		multi: true
	}]
})
export class DivValueAccessorDirective implements ControlValueAccessor {
	onChange = (_) => {};
	onTouched = () => {};

	constructor(
			private _renderer: Renderer2,
			private _elementRef: ElementRef
	) {}

	public writeValue(value: string): void {
		const normalizedValue = String(value);
		/* if (normalizedValue) {
			normalizedValue = normalizedValue.replace(/^s|s$/g, ' ');
		} */
		this._renderer.setProperty(
			this._elementRef.nativeElement, 'innerHTML', normalizedValue);
	}

	public registerOnChange(fn: (_: any) => void): void {
			this.onChange = (target: any) => {
					fn(target.innerText);
			};
	}

	public registerOnTouched(fn: () => void): void {
			this.onTouched = fn;
	}
}
