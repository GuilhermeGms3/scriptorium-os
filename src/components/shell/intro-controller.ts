/** Milliseconds; the CSS delays in intro-splash.css are written against SHOW_MS. */
const SHOW_MS = 4600;
const EXIT_MS = 1000;
const STATIC_SHOW_MS = 1700;
const STATIC_EXIT_MS = 400;

/**
 * Inline in <head>, so it runs before the first paint and does not wait for the app to load: on a
 * document load it turns the opening on (a class on <html>); the opening's markup is already in the
 * server HTML and its animation is CSS, so it shows on the very first frame. It also ends the
 * opening (the name flies to the logo in the top bar), handles skipping, and exposes `play` for
 * "Ver a abertura de novo". Plain ES5 on purpose: it runs before any bundle.
 */
export const INTRO_INIT = `(function(){
var SHOW=${SHOW_MS},EXIT=${EXIT_MS},STATIC_SHOW=${STATIC_SHOW_MS},STATIC_EXIT=${STATIC_EXIT_MS};
var root=document.documentElement,showTimer=0,endTimer=0,safety=0,reduced=false;
function on(){return root.classList.contains("intro-on")}
function finish(){clearTimeout(showTimer);clearTimeout(endTimer);clearTimeout(safety);root.classList.remove("intro-on","intro-out","intro-fly")}
function exit(){
if(!on()||root.classList.contains("intro-out"))return;
clearTimeout(showTimer);clearTimeout(safety);
var mark=document.querySelector("[data-intro-mark]"),target=document.querySelector("[data-brand-mark]");
if(mark&&target&&!reduced){var a=mark.getBoundingClientRect(),b=target.getBoundingClientRect();
if(a.width&&b.width){root.style.setProperty("--intro-dx",(b.left+b.width/2-a.left-a.width/2)+"px");
root.style.setProperty("--intro-dy",(b.top+b.height/2-a.top-a.height/2)+"px");
root.style.setProperty("--intro-scale",String(b.width/a.width));root.classList.add("intro-fly")}}
root.classList.add("intro-out");endTimer=setTimeout(finish,reduced?STATIC_EXIT:EXIT)}
function play(){
finish();reduced=!!(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches);
void root.offsetWidth;root.classList.add("intro-on");
if(reduced)showTimer=setTimeout(exit,STATIC_SHOW);else safety=setTimeout(exit,SHOW+8000)}
document.addEventListener("animationstart",function(e){if(e.animationName==="intro-begin"&&on()&&!root.classList.contains("intro-out")){clearTimeout(showTimer);showTimer=setTimeout(exit,SHOW)}},true);
document.addEventListener("click",function(e){var el=e.target;if(on()&&el&&el.closest&&el.closest(".intro"))exit()},true);
document.addEventListener("keydown",function(e){if(!on())return;if(e.key==="Tab"){e.preventDefault();return}
if(e.key==="Escape"||e.key==="Enter"||e.key===" "){e.preventDefault();exit()}},true);
window.__scriptoriumIntro={play:play,skip:exit};
play()})()`;

/** Shows the opening again ("Ajuda e sobre"). */
export function replayIntro(): void {
  (window as Window & { __scriptoriumIntro?: { play(): void } }).__scriptoriumIntro?.play();
}
