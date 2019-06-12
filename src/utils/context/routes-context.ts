export class AddRouteContext {
    routingModulePath: string; // path of the routing module
    moduleName: string; // name of the module to add
    parentComponent: string // parent route
    childrenArrayIndex: number // index of the children array to be inserted to
}
