// 'postprocessing' for code outside the core (vite.config.js aliases the package name to this file): the core
// bundles postprocessing 6.36 under minified names, and a pass from a second copy would not be recognised by
// the core's effect composer (it adds children that are instances of its own Pass). Only what's used is here.
const P = globalThis.__BP_PP();
export const { Pass } = P;
