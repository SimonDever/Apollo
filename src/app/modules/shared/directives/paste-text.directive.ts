import { Directive, ElementRef, HostListener } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
	selector: '[pasteText]',
})
export class PasteTextDirective {
	constructor(private el: ElementRef, private control: NgControl) {}

	@HostListener('paste', ['$event']) onEvent($event) {
		$event.preventDefault();
		const data = $event.clipboardData.getData('text');
		this.control.control.setValue(data);
	}
}
