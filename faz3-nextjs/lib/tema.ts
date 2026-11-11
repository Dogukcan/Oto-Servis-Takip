export const TEMA_ANAHTARI = "tema";

// Runs in <head> before the first paint, so the page never flashes the wrong
// theme. A saved choice wins; otherwise the device setting decides.
export const TEMA_BASLANGIC_BETIGI = `(function(){var t;try{t=localStorage.getItem("${TEMA_ANAHTARI}")}catch(e){}if(t!=="acik"&&t!=="koyu"){t=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"koyu":"acik"}document.documentElement.dataset.tema=t})()`;
