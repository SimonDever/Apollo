import { RouteReuseStrategy, ActivatedRouteSnapshot, DetachedRouteHandle } from '@angular/router';

export class CustomRouteReuseStategy implements RouteReuseStrategy {
	handlers: { [key: string]: DetachedRouteHandle } = {};

	calcKey(route: ActivatedRouteSnapshot) {
		return route.pathFromRoot
			.map((v) => v.url.map((segment) => segment.toString()).join('/'))
			.filter((url) => !!url)
			.join('/');
	}

	shouldDetach(route: ActivatedRouteSnapshot): boolean {
		return true;
	}

	store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle): void {
		this.handlers[this.calcKey(route)] = handle;
	}

	shouldAttach(route: ActivatedRouteSnapshot): boolean {
		return !!route.routeConfig && !!this.handlers[this.calcKey(route)];
	}

	retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle {
		if (!route.routeConfig) {
			return null as any;
		}
		if (route.routeConfig.loadChildren) {
			Object.keys(this.handlers).forEach((key) => delete this.handlers[key]);
			return null as any;
		}
		return this.handlers[this.calcKey(route)];
	}

	shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot): boolean {
		return this.calcKey(curr) === this.calcKey(future);
	}
}
