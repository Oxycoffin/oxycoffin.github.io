(function(){var k='pg-lang',s=null;try{s=localStorage.getItem(k)}catch(e){}
var l=s||((navigator.language||'en').slice(0,2)==='es'?'es':'en');
function set(x){document.documentElement.lang=x;var b=document.querySelectorAll('[data-set-lang]');for(var i=0;i<b.length;i++)b[i].setAttribute('aria-pressed',b[i].getAttribute('data-set-lang')===x?'true':'false');
var t=document.querySelector('meta[name="pg-title-'+x+'"]');if(t)document.title=t.content;try{localStorage.setItem(k,x)}catch(e){}}
document.addEventListener('DOMContentLoaded',function(){set(l);var b=document.querySelectorAll('[data-set-lang]');for(var i=0;i<b.length;i++)b[i].addEventListener('click',function(){set(this.getAttribute('data-set-lang'))})});})();
