// Gerador de QR code mínimo e sem dependências (modo byte, correção de erros M, versões 1 a 10).
// Uso: QR.svg('https://...') devolve o <svg> pronto (fundo branco, módulos pretos, borda de 4 módulos).
(function(){
  var ECC=[10,16,26,18,24,16,18,22,22,26];   // bytes de correção por bloco (versão 1..10, nível M)
  var BLK=[1,1,1,2,2,4,4,4,5,5];             // quantidade de blocos
  var ALIGN=[0,0,[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50]]; // padrões de alinhamento

  // --- aritmética de Reed-Solomon (corpo de Galois 256, polinômio 0x11D) ---
  var EXP=[],LOG=[],x=1,i;
  for(i=0;i<255;i++){ EXP[i]=x; LOG[x]=i; x<<=1; if(x&256) x^=0x11D; }
  for(i=255;i<512;i++) EXP[i]=EXP[i-255];
  function mul(a,b){ return a&&b?EXP[LOG[a]+LOG[b]]:0; }
  function gerador(grau){
    var r=[1],j;
    for(var k=0;k<grau;k++){
      var n=[]; for(j=0;j<=r.length;j++) n[j]=0;
      for(j=0;j<r.length;j++){ n[j]^=r[j]; n[j+1]^=mul(r[j],EXP[k]); }
      r=n;
    }
    return r;
  }
  function resto(dados,gen){
    var d=gen.length-1,res=[],k;
    for(k=0;k<d;k++) res[k]=0;
    dados.forEach(function(b){
      var f=b^res.shift(); res.push(0);
      for(var m=0;m<d;m++) res[m]^=mul(gen[m+1],f);
    });
    return res;
  }

  function modulosBrutos(v){
    var r=(16*v+128)*v+64;
    if(v>=2){ var a=Math.floor(v/7)+2; r-=(25*a-10)*a-55; if(v>=7) r-=36; }
    return r;
  }

  // --- texto -> bytes de dados + correção, já intercalados ---
  function codewords(texto){
    var bytes=unescape(encodeURIComponent(texto)).split('').map(function(c){ return c.charCodeAt(0); });
    var v,cap,ccb;
    for(v=1;v<=10;v++){
      cap=(modulosBrutos(v)>>3)-ECC[v-1]*BLK[v-1];
      ccb=v<10?8:16;
      if(4+ccb+8*bytes.length<=cap*8) break;
    }
    if(v>10) return null; // texto longo demais
    var bits=[];
    function poe(val,n){ for(var k=n-1;k>=0;k--) bits.push((val>>k)&1); }
    poe(4,4); poe(bytes.length,ccb);
    bytes.forEach(function(b){ poe(b,8); });
    poe(0,Math.min(4,cap*8-bits.length));
    while(bits.length%8) bits.push(0);
    for(var pad=0xEC;bits.length<cap*8;pad^=0xEC^0x11) poe(pad,8);
    var dados=[];
    for(i=0;i<bits.length;i+=8){ var b=0; for(var k=0;k<8;k++) b=(b<<1)|bits[i+k]; dados.push(b); }

    var nb=BLK[v-1], ecl=ECC[v-1], total=modulosBrutos(v)>>3;
    var curtos=nb-total%nb, lenCurto=Math.floor(total/nb)-ecl, gen=gerador(ecl);
    var blocos=[],ecs=[],pos=0;
    for(i=0;i<nb;i++){
      var d=dados.slice(pos,pos+lenCurto+(i<curtos?0:1)); pos+=d.length;
      blocos.push(d); ecs.push(resto(d,gen));
    }
    var saida=[];
    for(i=0;i<=lenCurto;i++) blocos.forEach(function(d){ if(i<d.length) saida.push(d[i]); });
    for(i=0;i<ecl;i++) ecs.forEach(function(e){ saida.push(e[i]); });
    return {versao:v,dados:saida};
  }

  // --- desenho da matriz ---
  function matriz(texto){
    var cw=codewords(texto); if(!cw) return null;
    var v=cw.versao, N=v*4+17, M=[], F=[], y, xx;
    for(y=0;y<N;y++){ M[y]=[]; F[y]=[]; for(xx=0;xx<N;xx++){ M[y][xx]=false; F[y][xx]=false; } }
    function funcao(px,py,escuro){ if(px<0||py<0||px>=N||py>=N) return; M[py][px]=!!escuro; F[py][px]=true; }

    function formato(mascara){
      var d=mascara, rem=d, k; // nível M = 00
      for(k=0;k<10;k++) rem=(rem<<1)^((rem>>9)*0x537);
      var bits=((d<<10)|rem)^0x5412;
      function b(n){ return ((bits>>n)&1)!==0; }
      for(k=0;k<=5;k++) funcao(8,k,b(k));
      funcao(8,7,b(6)); funcao(8,8,b(7)); funcao(7,8,b(8));
      for(k=9;k<15;k++) funcao(14-k,8,b(k));
      for(k=0;k<8;k++) funcao(N-1-k,8,b(k));
      for(k=8;k<15;k++) funcao(8,N-15+k,b(k));
      funcao(8,N-8,true);
    }

    // marcas de tempo, localizadores e alinhamento
    for(i=0;i<N;i++){ funcao(6,i,i%2===0); funcao(i,6,i%2===0); }
    [[3,3],[N-4,3],[3,N-4]].forEach(function(c){
      for(var dy=-4;dy<=4;dy++) for(var dx=-4;dx<=4;dx++){
        var dist=Math.max(Math.abs(dx),Math.abs(dy));
        funcao(c[0]+dx,c[1]+dy,dist!==2&&dist!==4);
      }
    });
    var al=ALIGN[v]||[], ult=al.length-1;
    al.forEach(function(ay,a){ al.forEach(function(ax,b){
      if((a===0&&b===0)||(a===0&&b===ult)||(a===ult&&b===0)) return;
      for(var dy=-2;dy<=2;dy++) for(var dx=-2;dx<=2;dx++) funcao(ax+dx,ay+dy,Math.max(Math.abs(dx),Math.abs(dy))!==1);
    }); });
    formato(0);
    if(v>=7){
      var rem=v,k;
      for(k=0;k<12;k++) rem=(rem<<1)^((rem>>11)*0x1F25);
      var vb=(v<<12)|rem;
      for(k=0;k<18;k++){ var bit=((vb>>k)&1)!==0, a2=N-11+k%3, b2=Math.floor(k/3); funcao(a2,b2,bit); funcao(b2,a2,bit); }
    }

    // bytes em zigue-zague
    var n=0, total=cw.dados.length*8;
    for(var dir=N-1;dir>=1;dir-=2){
      if(dir===6) dir=5;
      for(var vert=0;vert<N;vert++) for(var j=0;j<2;j++){
        var px=dir-j, sobe=((dir+1)&2)===0, py=sobe?N-1-vert:vert;
        if(!F[py][px]&&n<total){ M[py][px]=((cw.dados[n>>3]>>(7-(n&7)))&1)!==0; n++; }
      }
    }

    function mascarar(m){
      for(var py=0;py<N;py++) for(var px=0;px<N;px++){
        var inv;
        switch(m){
          case 0: inv=(px+py)%2===0; break;
          case 1: inv=py%2===0; break;
          case 2: inv=px%3===0; break;
          case 3: inv=(px+py)%3===0; break;
          case 4: inv=(Math.floor(px/3)+Math.floor(py/2))%2===0; break;
          case 5: inv=px*py%2+px*py%3===0; break;
          case 6: inv=(px*py%2+px*py%3)%2===0; break;
          default: inv=((px+py)%2+px*py%3)%2===0;
        }
        if(inv&&!F[py][px]) M[py][px]=!M[py][px];
      }
    }
    function penalidade(){
      var p=0,py,px,linhas=[],escuros=0;
      for(py=0;py<N;py++){ var s=''; for(px=0;px<N;px++){ s+=M[py][px]?'1':'0'; if(M[py][px]) escuros++; } linhas.push(s); }
      for(px=0;px<N;px++){ var c=''; for(py=0;py<N;py++) c+=M[py][px]?'1':'0'; linhas.push(c); }
      linhas.forEach(function(s){
        var run=1,k;
        for(k=1;k<=N;k++){
          if(k<N&&s[k]===s[k-1]) run++;
          else{ if(run>=5) p+=3+run-5; run=1; }
        }
        ['10111010000','00001011101'].forEach(function(pad){
          var at=s.indexOf(pad); while(at>=0){ p+=40; at=s.indexOf(pad,at+1); }
        });
      });
      for(py=0;py<N-1;py++) for(px=0;px<N-1;px++){
        var cor=M[py][px]; if(cor===M[py][px+1]&&cor===M[py+1][px]&&cor===M[py+1][px+1]) p+=3;
      }
      p+=(Math.ceil(Math.abs(escuros*20-N*N*10)/(N*N))-1)*10;
      return p;
    }
    var melhor=0, menor=Infinity;
    for(var m=0;m<8;m++){
      mascarar(m); formato(m);
      var pen=penalidade(); if(pen<menor){ menor=pen; melhor=m; }
      mascarar(m);
    }
    mascarar(melhor); formato(melhor);
    return {tamanho:N, escuro:M, versao:v, mascara:melhor};
  }

  function svg(texto,borda){
    var q=matriz(texto); if(!q) return '';
    borda=borda==null?4:borda;
    var d='',t=q.tamanho+borda*2;
    for(var y=0;y<q.tamanho;y++) for(var x=0;x<q.tamanho;x++)
      if(q.escuro[y][x]) d+='M'+(x+borda)+' '+(y+borda)+'h1v1h-1z';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+t+' '+t+'" shape-rendering="crispEdges">'+
           '<rect width="'+t+'" height="'+t+'" fill="#fff"/><path d="'+d+'" fill="#000"/></svg>';
  }

  window.QR={svg:svg,matriz:matriz};
})();
