// ClassGrocery runs entirely in the browser, and a store is read from the part
// of its link after the #, which a server never sees. So there is nothing
// useful to render on a server, and no page can be built ahead of time.
export const ssr = false
export const prerender = false
