const x=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const E=(t,c,h)=>{const e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e};
const fd=(s,o)=>new Date(s).toLocaleDateString('ru-RU',o||{day:'numeric',month:'long'}),
ft=s=>new Date(s).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'});
let D,S;const club=id=>D.clubs.find(c=>c.id==id)||{name:'?',city:'',logo:''};
const sc=m=>['home','away'].map(t=>(m.goals||[]).filter(g=>g.team==t).length);
const $=s=>document.querySelector(s),app=$('#app');
fetch('/api/all').then(r=>r.json()).then(d=>{D=d;S=d.settings[0]||{};init()});
function modal(h){const m=$('#m');m.innerHTML='<button class=x>×</button><div class=mod>'+h+'</div>';m.hidden=false;m.querySelector('.x').onclick=()=>m.hidden=true;m.scrollTop=0}
function slider(els,cls){const w=E('div','wrap'),t=E('div','track '+(cls||''));els.forEach(e=>t.append(e));w.append(t);
  if(!cls){const a=E('div','arr','<button>‹</button><button>›</button>'),b=a.children;b[0].onclick=()=>t.scrollBy(-t.clientWidth,0);b[1].onclick=()=>t.scrollBy(t.clientWidth,0);w.append(a)}return w}
function sec(h){const s=E('section');if(h)s.append(E('h2','big',h));app.append(s);return s}
function init(){
  const r=document.documentElement.style;[['cHeader','--h'],['cBg','--bg'],['cText','--t'],['cAccent','--a'],['cCard','--c']].forEach(([k,v])=>S[k]&&r.setProperty(v,S[k]));
  $('#lg').src=S.logo||'';$('#tn').textContent=S.teamName||'Челны 2011';$('#ts').textContent=S.subtitle||'хоккейный клуб';
  $('#mn').innerHTML=(S.menu||[]).map(i=>`<a href="${x(i.url)}">${x(i.title)}</a>`).join('');$('#bg').onclick=()=>$('#mn').hidden=!$('#mn').hidden;
  news();stories();day();table();tops();leaders();albums()}
function news(){const a=[...D.news].sort((p,q)=>new Date(q.dt)-new Date(p.dt));if(!a.length)return;
  sec().append(slider(a.map(n=>{const e=E('div','news',`<img src="${x(n.image)}"><span class=tag>${x(n.tag)}</span><h3>${x(n.title)}</h3>`);
  e.onclick=()=>modal(`<img class=cv src="${x(n.image)}"><p><small>${fd(n.dt)}, ${ft(n.dt)} · ${x(n.tag)}</small></p><h1>${x(n.title)}</h1><p>${x(n.text).replace(/\n/g,'<br>')}</p>`);return e})))}
function stories(){if(!D.stories.length)return;sec().append(slider(D.stories.map(s=>{const e=E('div','story',`<img src="${x(s.image)}">`);
  e.onclick=()=>{const o=E('div','full',`<img src="${x(s.image)}"><i></i>`),t=setTimeout(()=>o.remove(),15000);o.onclick=()=>{clearTimeout(t);o.remove()};document.body.append(o)};return e}),'stories'))}
function pick(){const n=new Date(),a=[...D.matches].sort((p,q)=>new Date(p.dt)-new Date(q.dt));
  return a.find(m=>m.status=='live')||a.find(m=>m.status=='done'&&new Date(m.dt).toDateString()==n.toDateString())||a.find(m=>m.status!='done'&&new Date(m.dt)>n-144e5)||a.filter(m=>m.status=='done').pop()}
function label(m){const d=Math.round((new Date(new Date(m.dt).toDateString())-new Date(new Date().toDateString()))/864e5);
  return d==0?'Сегодня':d==1?'Завтра':d>1&&d<7?fd(m.dt,{weekday:'long'}):fd(m.dt)}
function mcard(m){const h=club(m.home),a=club(m.away),[g1,g2]=sc(m),pl=m.status=='planned';
  return `<div class=tm><div><img src="${x(h.logo)}"><b>${x(h.name)}</b><small>${x(h.city)}</small></div><div class=sc>${pl?ft(m.dt):g1+'-'+g2}</div><div><img src="${x(a.logo)}"><b>${x(a.name)}</b><small>${x(a.city)}</small></div></div>`}
function day(){const m=pick(),s=sec('День матча');if(!m){s.append(E('p',0,'Матчей пока нет'));return}
  const d=E('div','day',`<h2>${label(m)}</h2><div class=mc><small>${x(m.tournament)}</small><b>${x(m.place)}</b>${mcard(m)}<button class=btn id=ov>Обзор матча</button></div><button class=btn id=al>Ко всем матчам</button>`);
  s.append(d);d.querySelector('#ov').onclick=()=>over(m);d.querySelector('#al').onclick=all}
function lines(t){return (t||'').split('\n').filter(Boolean).map(l=>`<div class=ev>${x(l)}</div>`).join('')}
function over(m){const h=club(m.home),a=club(m.away),show=m.status!='planned'||Date.now()>=new Date(m.dt)-36e5;
  const ev=(l,f)=>(l||[]).slice().sort((p,q)=>parseInt(p.time)-parseInt(q.time)).map(f).join('')||'<p><small>Пока нет</small></p>';
  const nm=t=>x(club(m[t]).name);
  modal(`<small>${fd(m.dt,{day:'numeric',month:'long',year:'numeric'})}, ${ft(m.dt)} · ${x(m.place)} · ${x(m.tournament)}</small>${mcard(m)}
  ${show?`<h2>Составы</h2><h3>${nm('home')}</h3>${lines(m.lineupHome)}<h3>${nm('away')}</h3>${lines(m.lineupAway)}`:'<p><small>Составы появятся за час до игры</small></p>'}
  <h2>Голы</h2>${ev(m.goals,g=>`<div class=ev>${x(g.time)}' · №${x(g.num)} ${x(g.name)} (${nm(g.team)}) <small>${x(g.str)}</small></div>`)}
  <h2>Удаления</h2>${ev(m.penalties,p=>`<div class=ev>${x(p.time)}' · №${x(p.num)} ${x(p.name)} (${nm(p.team)}) — ${x(p.reason)}, ${x(p.min)} мин</div>`)}`)}
function row(m){const[g1,g2]=sc(m),h=club(m.home),a=club(m.away),pl=m.status=='planned';
  const e=E('div','r',`<img src="${x(h.logo)}"><div class=g><b>${pl?ft(m.dt):g1+':'+g2}</b><small>${fd(m.dt)}</small></div><img src="${x(a.logo)}">`);e.onclick=()=>over(m);e.style.cursor='pointer';return e}
function all(){modal('<h2 class=big>Матчи</h2><div class=tabs><button class=on>Результаты</button><button>Предстоящие</button></div><div class=card id=ml></div>');
  const [b1,b2]=document.querySelectorAll('.mod .tabs button'),L=$('#ml');
  const draw=d=>{L.innerHTML='';const a=D.matches.filter(m=>(m.status=='done')==d).sort((p,q)=>(new Date(p.dt)-new Date(q.dt))*(d?-1:1));a.forEach(m=>L.append(row(m)));if(!a.length)L.innerHTML='<p>Пусто</p>'};
  b1.onclick=()=>{b1.className='on';b2.className='';draw(1)};b2.onclick=()=>{b2.className='on';b1.className='';draw(0)};draw(1)}
function table(){const s=sec(S.tournament||'Турнир'),l3=D.matches.filter(m=>m.status=='done').sort((p,q)=>new Date(q.dt)-new Date(p.dt)).slice(0,3);
  if(l3.length){const c=E('div','card');l3.forEach(m=>c.append(row(m)));s.append(c)}
  const rows=(D.standings[0]||{}).rows||[];if(!rows.length)return;
  s.append(E('div','card',`<table><tr><th>М<th>Команда<th>И<th>В<th>ВО<th>ВБ<th>ПО<th>ПБ<th>П<th>О</tr>${rows.map(r=>`<tr><td>${x(r.place)}<td><img src="${x(club(r.team).logo)}">${x(club(r.team).name)}${['gp','w','wo','wb','lo','lb','l','pts'].map(k=>`<td>${x(r[k])}`).join('')}</tr>`).join('')}</table>`))}
const CATS=[['scorers','Бомбардиры','Очки'],['snipers','Снайперы','Голы'],['defenders','Бомбардиры-защитники','Очки'],['plusminus','Плюс/минус','+/-']];
function tops(){const T=D.tops[0]||{};if(!CATS.some(c=>(T[c[0]]||[]).length))return;
  sec().append(slider(CATS.map(([k,n,v])=>E('div','card',`<h3 style="padding:14px 0;color:#777">${n}</h3>`+(T[k]||[]).map(p=>`<div class=pl><img src="${x(p.photo)}"><div><b>${x(p.name)}</b><br><small>${x(p.num)} | ${x(p.pos)}</small></div><b class=v>${x(p.value)}</b></div>`).join(''))).map(e=>(e.style.flex='0 0 88%',e)),'tp'))}
function leaders(){if(!D.leaders.length)return;const s=sec(),L=E('div'),T=E('div','tabs');let cur=CATS[0][0];
  const draw=()=>{T.innerHTML='';CATS.forEach(([k,n])=>{const b=E('button',k==cur?'on':'',n.replace('Бомбардиры-защитники','Защитник').replace(/ы$/,''));b.onclick=()=>{cur=k;draw()};T.append(b)});
    L.innerHTML='';const a=D.leaders.filter(p=>p.cat==cur).map(p=>E('div','lead',`<h2>Лидеры команды</h2><div class=n>${x(p.num)}</div><img src="${x(p.image)}"><div class=i><h3>${x(p.name)}</h3><small>#${x(p.num)} | ${x(p.pos)}</small><div class=st>${(p.stats||[]).map(t=>`<div><b>${x(t.value)}</b><small>${x(t.label)}</small></div>`).join('')}</div></div>`));
    if(a.length)L.append(slider(a))};
  s.append(T,L);draw()}
function albums(){if(!D.albums.length)return;const s=sec('Последние фото');
  s.append(slider([...D.albums].sort((p,q)=>new Date(q.date)-new Date(p.date)).map(a=>{const e=E('div','al',`<img src="${x(a.cover)}"><div><small>${fd(a.date,{day:'numeric',month:'long',year:'numeric'})}</small><br><b>${x(a.title)}</b></div>`);
  e.onclick=()=>modal(`<h1>${x(a.title)}</h1><p><small>${fd(a.date)}</small></p><div class=ph>${(a.photos||[]).map(p=>`<img loading=lazy src="${x(p)}">`).join('')}</div>`);return e}),'al'))}
