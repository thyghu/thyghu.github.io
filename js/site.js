// TH Maestro Apps — comportamento comum do site (estrelas, menu, galeria, vídeo)
(function(){
  // estrelas
  var box=document.getElementById('stars');
  if(box){
    var n=window.innerWidth<600?24:44; // poucas estrelas: cada uma é uma animação
    for(var i=0;i<n;i++){
      var s=document.createElement('span'); s.className=i%3?'star':'star tw';
      var z=Math.random()<.15?3:(Math.random()<.5?2:1);
      s.style.width=s.style.height=z+'px';
      s.style.left=(Math.random()*100)+'%'; s.style.top=(Math.random()*100)+'%';
      s.style.animationDelay=(Math.random()*3)+'s';
      box.appendChild(s);
    }
    for(var j=0;j<4;j++){
      var k=document.createElement('span'); k.className='spark'; k.textContent='✦';
      k.style.left=(5+Math.random()*90)+'%'; k.style.top=(5+Math.random()*80)+'%';
      k.style.fontSize=(12+Math.random()*14)+'px'; k.style.animationDelay=(Math.random()*4)+'s';
      box.appendChild(k);
    }
  }

  // menu no celular
  var burger=document.getElementById('burger'), menu=document.getElementById('menu');
  if(burger&&menu){
    burger.addEventListener('click',function(){
      var aberto=menu.classList.toggle('open');
      burger.setAttribute('aria-expanded',aberto?'true':'false');
    });
    menu.addEventListener('click',function(e){
      if(e.target.tagName==='A'){ menu.classList.remove('open'); burger.setAttribute('aria-expanded','false'); }
    });
  }

  // telas que trocam sozinhas dentro do monitor, do tablet e do celular
  var calmo=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!calmo){
    [].forEach.call(document.querySelectorAll('.slides'),function(box,n){
      var sl=box.querySelectorAll('.slide'); if(sl.length<2) return;
      var i=0, seg=sl[1].querySelector('img'); if(seg) seg.loading='eager'; // a segunda já vem pronta
      function naTela(){ var r=box.getBoundingClientRect(); return r.bottom>0&&r.top<(window.innerHeight||0); }
      setTimeout(function(){
        setInterval(function(){
          if(document.hidden||!naTela()) return; // parado quando não aparece
          sl[i].classList.remove('on'); i=(i+1)%sl.length; sl[i].classList.add('on');
          var prox=sl[(i+1)%sl.length].querySelector('img'); if(prox) prox.loading='eager'; // já carrega a próxima
        },3600);
      },n*1200); // cada aparelho troca num momento diferente
    });
  }

  // vídeo: só carrega o YouTube (sem cookies) quando a pessoa clica
  var v=document.getElementById('videoBtn');
  if(v){
    v.addEventListener('click',function(){
      var id=v.getAttribute('data-id'), f=document.createElement('iframe');
      f.src='https://www.youtube-nocookie.com/embed/'+id+'?autoplay=1&rel=0';
      f.title=v.getAttribute('aria-label');
      f.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      f.allowFullscreen=true;
      v.parentNode.replaceChild(f,v);
    });
  }

  // aparece ao entrar na tela
  // (conferido a cada rolagem: funciona em qualquer navegador e até em blocos mais altos que a tela)
  var pendentes=[].slice.call(document.querySelectorAll('.reveal, .sec-title'));
  function revelar(){
    var h=window.innerHeight||document.documentElement.clientHeight;
    pendentes=pendentes.filter(function(el){
      var r=el.getBoundingClientRect();
      if(r.top<h*0.92&&r.bottom>0){ el.classList.add('in'); return false; }
      return true;
    });
  }

  // cabeçalho encolhe e barra de progresso (quando o CSS não faz sozinho)
  var top=document.querySelector('.top'), bar=document.querySelector('.progress');
  var cssFaz=window.CSS&&CSS.supports&&CSS.supports('animation-timeline: scroll()');
  function aoRolar(){
    revelar();
    var y=window.scrollY||document.documentElement.scrollTop;
    if(top) top.classList.toggle('scrolled',y>40);
    if(bar&&!cssFaz){
      var max=document.documentElement.scrollHeight-window.innerHeight;
      bar.style.transform='scaleX('+(max>0?Math.min(1,y/max):0)+')';
    }
  }
  var pedido=false; // no máximo uma checagem por quadro
  window.addEventListener('scroll',function(){ if(!pedido){ pedido=true; requestAnimationFrame(function(){ pedido=false; aoRolar(); }); } },{passive:true});
  window.addEventListener('resize',aoRolar);
  window.addEventListener('load',aoRolar);
  aoRolar();

  // ano no rodapé
  var ano=document.getElementById('ano');
  if(ano) ano.textContent=new Date().getFullYear();
})();
