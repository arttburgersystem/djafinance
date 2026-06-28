// ── DAILY OPERATION ─────────────────────────────────────────────────────────
(function(){
  if(document.getElementById('do-style'))return;
  var s=document.createElement('style');s.id='do-style';
  s.textContent='@keyframes doPulse{0%,100%{box-shadow:0 0 0 0 transparent}50%{box-shadow:0 0 0 8px rgba(229,172,0,.30)}}';
  document.head.appendChild(s);
})();

var _doTimerRef=null;

// ── helpers ──────────────────────────────────────────────────────────────────
function _doHora(){
  var d=new Date(new Date().toLocaleString('en-US',{timeZone:'America/Sao_Paulo'}));
  return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
}
function _doDeveAlertar(op){
  if(!op.horario||op.status!=='hoje')return false;
  var h=op.horario.split(':'),taMin=parseInt(h[0])*60+parseInt(h[1]);
  var n=_doHora().split(':'),nowMin=parseInt(n[0])*60+parseInt(n[1]);
  var alMin=parseInt(op.alertaMinutos)||15;
  return nowMin>=(taMin-alMin)&&nowMin<=(taMin+30);
}
function _doFmtData(s){
  if(!s)return '';var p=s.split('-');return p[2]+'/'+p[1]+'/'+p[0];
}
function _doFmtHoraISO(iso){
  if(!iso)return '';
  try{var d=new Date(iso);return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');}
  catch(e){return '';}
}
function _doAtrasoLabel(op){
  var hj=today();if(!op.data||op.data>=hj)return 'pendente';
  var diff=Math.round((new Date(hj+'T12:00:00')-new Date(op.data+'T12:00:00'))/86400000);
  return diff===1?'há 1 dia':'há '+diff+' dias';
}

// ── inicialização diária ──────────────────────────────────────────────────────
function _doInit(){
  var hj=today(),dow=new Date(hj+'T12:00:00').getDay(),pf=state.profile;
  var defs=(state.dailyTaskDefs||[]).filter(function(d){return d.profile===pf&&d.ativo;});
  var ops=(state.dailyOps||[]).slice();var changed=false;

  // 1. Marcar 'hoje' de dias anteriores como 'pendente'
  ops=ops.map(function(op){
    if(op.profile===pf&&op.status==='hoje'&&op.data<hj){changed=true;return Object.assign({},op,{status:'pendente'});}
    return op;
  });

  // 2. Criar instâncias de hoje a partir dos templates
  defs.forEach(function(def){
    var dias=def.dias||[];
    if(dias.length&&dias.indexOf(dow)<0)return;
    var existe=ops.some(function(op){return op.defId===def.id&&op.data===hj&&op.profile===pf;});
    if(!existe){
      ops.push({
        id:uid(),defId:def.id,profile:pf,
        nome:def.nome,descricao:def.descricao||'',
        horario:def.horario||'',cor:def.cor||'gold',
        prioridade:def.prioridade||'media',alertaMinutos:def.alertaMinutos||15,
        data:hj,status:'hoje',criadaEm:new Date().toISOString(),
        concluidaEm:null,canceladaEm:null,adiada:null,motivoCancelamento:'',
      });
      changed=true;
    }
  });

  // 3. Tarefas adiadas cujo dia chegou → de volta para 'hoje'
  ops=ops.map(function(op){
    if(op.profile===pf&&op.status==='adiada'&&op.adiada&&op.adiada.para<=hj){
      changed=true;return Object.assign({},op,{status:'hoje',data:hj});
    }
    return op;
  });

  if(changed){lsSet('dailyOps',ops);state.dailyOps=ops;scheduleSave();}
}

// ── ações ─────────────────────────────────────────────────────────────────────
function _doConcluir(id){
  var ops=(state.dailyOps||[]).map(function(op){
    return op.id===id?Object.assign({},op,{status:'concluida',concluidaEm:new Date().toISOString()}):op;
  });
  lsSet('dailyOps',ops);setState({dailyOps:ops});scheduleSave();showToast('Tarefa concluída!','success');
}
function _doCancelar(id,motivo){
  var ops=(state.dailyOps||[]).map(function(op){
    return op.id===id?Object.assign({},op,{status:'cancelada',canceladaEm:new Date().toISOString(),motivoCancelamento:motivo||''}):op;
  });
  lsSet('dailyOps',ops);setState({dailyOps:ops,dailyAdiModal:null});scheduleSave();showToast('Tarefa cancelada','error');
}
function _doAdiar(id,para,motivo){
  var ops=(state.dailyOps||[]).map(function(op){
    return op.id===id?Object.assign({},op,{status:'adiada',adiada:{para:para,motivo:motivo||''}}):op;
  });
  lsSet('dailyOps',ops);setState({dailyOps:ops,dailyAdiModal:null});scheduleSave();showToast('Adiada para '+_doFmtData(para));
}
function _doExcluir(id){
  if(!confirm('Remover esta tarefa do dia?'))return;
  var ops=(state.dailyOps||[]).filter(function(op){return op.id!==id;});
  lsSet('dailyOps',ops);setState({dailyOps:ops});scheduleSave();
}

// ── modal adiar/cancelar ──────────────────────────────────────────────────────
function renderDailyAdiModal(){
  var id=state.dailyAdiModal;if(!id)return null;
  var op=(state.dailyOps||[]).find(function(x){return x.id===id;});if(!op)return null;
  var motiEl=el('textarea',{class:'form-input',rows:'2',placeholder:'Motivo (opcional)',style:{resize:'vertical',minHeight:'56px'}});
  var dtEl=el('input',{class:'form-input',type:'date'});dtEl.value=today();
  return el('div',{class:'modal-overlay',onclick:function(e){if(e.target===this)setState({dailyAdiModal:null});}},[
    el('div',{class:'modal-box',style:{maxWidth:'380px',width:'95vw'}},[
      el('h3',{style:{margin:'0 0 12px',fontSize:'16px',color:'var(--text)'}},'↻ Adiar / Cancelar'),
      el('p',{style:{fontSize:'13px',color:'var(--text2)',marginBottom:'14px',fontWeight:'600'}},op.nome),
      div('form-group',[el('label',{class:'form-label'},'Adiar para:'),dtEl]),
      div('form-group',[el('label',{class:'form-label'},'Motivo (opcional):'),motiEl]),
      el('div',{style:{display:'flex',gap:'8px',marginTop:'16px',flexWrap:'wrap'}},[
        btn('btn-primary','↻ Adiar',function(){_doAdiar(id,dtEl.value||today(),motiEl.value.trim());}),
        el('button',{style:{padding:'8px 14px',borderRadius:'8px',border:'1px solid var(--red)',background:'none',color:'var(--red)',cursor:'pointer',fontSize:'13px',fontWeight:'600'},
          onclick:function(){_doCancelar(id,motiEl.value.trim());}
        },'✕ Cancelar tarefa'),
        btn('btn-ghost','Fechar',function(){setState({dailyAdiModal:null});}),
      ]),
    ])
  ]);
}

// ── modal nova tarefa / template ──────────────────────────────────────────────
function renderDailyModal(){
  var m=state.dailyModal;if(!m)return null;
  var edit=m.editItem||{};var isEdit=!!edit.id;var isOneOff=!!m.oneOff;
  function g(id){var e=document.getElementById('do-'+id);return e?e.value:'';}
  var diasSel=(edit.dias||[1,2,3,4,5]).slice();
  var diasLabels=['D','S','T','Q','Q','S','S'];
  var corSel=edit.cor||'gold';
  var corMap={gold:'var(--gold)',blue:'var(--blue)',green:'var(--green)',red:'var(--red)',purple:'#9c59b6'};

  var diasBtns=[0,1,2,3,4,5,6].map(function(i){
    var at=diasSel.indexOf(i)>=0;
    var b2=el('button',{type:'button',style:{
      width:'30px',height:'30px',borderRadius:'50%',border:'1px solid var(--border)',
      background:at?'var(--gold)':'var(--bg3)',color:at?'#000':'var(--text)',
      cursor:'pointer',fontSize:'12px',fontWeight:'700',transition:'all .15s',
    },onclick:function(){
      var idx=diasSel.indexOf(i);if(idx>=0)diasSel.splice(idx,1);else diasSel.push(i);
      var now=diasSel.indexOf(i)>=0;
      this.style.background=now?'var(--gold)':'var(--bg3)';this.style.color=now?'#000':'var(--text)';
    }},diasLabels[i]);
    return b2;
  });

  var corBtns=Object.keys(corMap).map(function(c){
    var cb=el('button',{type:'button',title:c,style:{
      width:'24px',height:'24px',borderRadius:'50%',cursor:'pointer',
      background:corMap[c],border:corSel===c?'2px solid var(--text)':'2px solid transparent',transition:'border .15s',
    },onclick:function(){
      corSel=c;
      var all=this.parentElement.querySelectorAll('button');
      all.forEach(function(b){b.style.border='2px solid transparent';});
      this.style.border='2px solid var(--text)';
    }});
    return cb;
  });

  function inp(id,type,ph,val,extra){
    var i=el('input',Object.assign({class:'form-input',type:type||'text',id:'do-'+id,placeholder:ph||''},extra||{}));
    i.value=val!==undefined?String(val):'';return i;
  }
  function selEl(id,opts,val){
    var s=el('select',{class:'form-input',id:'do-'+id});
    opts.forEach(function(o){var op2=el('option',{value:o.v},o.l);if(o.v===val)op2.selected=true;s.appendChild(op2);});
    return s;
  }

  function salvar(){
    var nome=g('nome').trim();
    if(!nome){var ni=document.getElementById('do-nome');if(ni){ni.style.border='2px solid var(--red)';}showToast('Informe o nome da tarefa','error');return;}
    if(isOneOff){
      var inst={
        id:uid(),defId:null,profile:state.profile,
        nome:nome,descricao:g('descricao'),horario:g('horario'),
        cor:corSel,prioridade:g('prioridade')||'media',alertaMinutos:15,
        data:today(),status:'hoje',criadaEm:new Date().toISOString(),
        concluidaEm:null,canceladaEm:null,adiada:null,motivoCancelamento:'',
      };
      var ops2=(state.dailyOps||[]).concat([inst]);
      lsSet('dailyOps',ops2);setState({dailyOps:ops2,dailyModal:null});scheduleSave();
      showToast('Tarefa adicionada ao dia!','success');
    } else {
      var def={
        id:edit.id||uid(),profile:state.profile,
        nome:nome,descricao:g('descricao'),horario:g('horario'),
        dias:diasSel.slice().sort(),alertaMinutos:parseInt(g('alerta'))||15,
        cor:corSel,prioridade:g('prioridade')||'media',ativo:true,
      };
      var defs=isEdit
        ?(state.dailyTaskDefs||[]).map(function(d){return d.id===def.id?def:d;})
        :(state.dailyTaskDefs||[]).concat([def]);
      lsSet('dailyTaskDefs',defs);setState({dailyTaskDefs:defs,dailyModal:null});scheduleSave();
      if(!isEdit){
        var dow=new Date(today()+'T12:00:00').getDay();
        if(!diasSel.length||diasSel.indexOf(dow)>=0){
          var inst2={
            id:uid(),defId:def.id,profile:state.profile,
            nome:def.nome,descricao:def.descricao,horario:def.horario,
            cor:def.cor,prioridade:def.prioridade,alertaMinutos:def.alertaMinutos,
            data:today(),status:'hoje',criadaEm:new Date().toISOString(),
            concluidaEm:null,canceladaEm:null,adiada:null,motivoCancelamento:'',
          };
          var ops3=(state.dailyOps||[]).concat([inst2]);
          lsSet('dailyOps',ops3);setState({dailyOps:ops3});
        }
      }
      showToast(isEdit?'Rotina atualizada!':'Rotina criada!','success');
    }
  }

  return el('div',{class:'modal-overlay',onclick:function(e){if(e.target===this)setState({dailyModal:null});}},[
    el('div',{class:'modal-box',style:{maxWidth:'440px',width:'96vw'}},[
      el('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}},[
        el('h3',{style:{margin:'0',fontSize:'16px',color:'var(--text)'}},
          isOneOff?'+ Tarefa Rápida (hoje)':isEdit?'Editar Rotina':'+ Nova Rotina Diária'),
        el('button',{class:'btn-ghost',style:{padding:'4px 10px'},onclick:function(){setState({dailyModal:null});}},'✕'),
      ]),
      div('form-group',[el('label',{class:'form-label'},'Nome da tarefa *'),inp('nome','text','Ex: Conferir caixa',edit.nome)]),
      div('form-group',[el('label',{class:'form-label'},'Descrição'),
        (function(){var t=el('textarea',{class:'form-input',id:'do-descricao',rows:'2',placeholder:'Detalhes opcionais...',style:{resize:'vertical'}});t.value=edit.descricao||'';return t;})()]),
      el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}},[
        div('form-group',[el('label',{class:'form-label'},'Horário'),inp('horario','time','',edit.horario||'')]),
        div('form-group',[el('label',{class:'form-label'},'Prioridade'),
          selEl('prioridade',[{v:'alta',l:'🔴 Alta'},{v:'media',l:'🟡 Média'},{v:'baixa',l:'🟢 Baixa'}],edit.prioridade||'media')]),
      ]),
      !isOneOff?div('form-group',[
        el('label',{class:'form-label'},'Repetir nos dias:'),
        el('div',{style:{display:'flex',gap:'6px',marginTop:'6px'}},diasBtns),
      ]):null,
      !isOneOff?div('form-group',[
        el('label',{class:'form-label'},'Alertar (min antes):'),
        inp('alerta','number','15',edit.alertaMinutos||15,{min:'0',max:'120',style:{width:'100px'}}),
      ]):null,
      div('form-group',[
        el('label',{class:'form-label'},'Cor:'),
        el('div',{style:{display:'flex',gap:'8px',marginTop:'6px'}},corBtns),
      ]),
      el('div',{style:{display:'flex',gap:'8px',marginTop:'20px'}},[
        btn('btn-primary',isEdit?'Salvar':'Criar',salvar),
        btn('btn-ghost','Cancelar',function(){setState({dailyModal:null});}),
      ]),
    ].filter(Boolean))
  ]);
}

// ── modal gerenciar rotinas ───────────────────────────────────────────────────
function renderDailyTemplatesModal(){
  if(!state.dailyTemplatesOpen)return null;
  var pf=state.profile;
  var defs=(state.dailyTaskDefs||[]).filter(function(d){return d.profile===pf;});
  var corMap={gold:'var(--gold)',blue:'var(--blue)',green:'var(--green)',red:'var(--red)',purple:'#9c59b6'};
  var diasN=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

  var lista=defs.length===0
    ?[el('div',{style:{color:'var(--text3)',fontSize:'13px',padding:'20px',textAlign:'center'}},'Nenhuma rotina ainda. Crie a primeira!')]
    :defs.map(function(d){
      return el('div',{style:{display:'flex',alignItems:'center',gap:'10px',padding:'10px 0',borderBottom:'1px solid var(--border)'}},[
        el('div',{style:{width:'10px',height:'10px',borderRadius:'50%',background:corMap[d.cor]||'var(--gold)',flexShrink:'0'}}),
        el('div',{style:{flex:'1'}},[
          el('div',{style:{fontWeight:'600',fontSize:'13px',color:d.ativo?'var(--text)':'var(--text3)'}},(d.ativo?'':'⏸ ')+d.nome),
          el('div',{style:{fontSize:'11px',color:'var(--text3)',marginTop:'2px'}},
            (d.horario?d.horario+' · ':'')+(d.dias&&d.dias.length?d.dias.map(function(i){return diasN[i];}).join(', '):'Todos os dias')+
            (d.prioridade?' · '+(d.prioridade==='alta'?'🔴':d.prioridade==='media'?'🟡':'🟢'):'')),
        ]),
        el('div',{style:{display:'flex',gap:'4px'}},[
          btn('btn-ghost',d.ativo?'⏸':'▶',function(){
            var nd=(state.dailyTaskDefs||[]).map(function(x){return x.id===d.id?Object.assign({},x,{ativo:!x.ativo}):x;});
            lsSet('dailyTaskDefs',nd);setState({dailyTaskDefs:nd});scheduleSave();
          }),
          btn('btn-ghost','✏️',function(){setState({dailyModal:{editItem:d},dailyTemplatesOpen:false});}),
          btn('btn-ghost','🗑️',function(){
            if(!confirm('Excluir rotina "'+d.nome+'"?'))return;
            var nd=(state.dailyTaskDefs||[]).filter(function(x){return x.id!==d.id;});
            lsSet('dailyTaskDefs',nd);setState({dailyTaskDefs:nd});scheduleSave();showToast('Rotina excluída','error');
          }),
        ]),
      ]);
    });

  return el('div',{class:'modal-overlay',onclick:function(e){if(e.target===this)setState({dailyTemplatesOpen:false});}},[
    el('div',{class:'modal-box',style:{maxWidth:'500px',width:'96vw',maxHeight:'80vh',display:'flex',flexDirection:'column'}},[
      el('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'14px'}},[
        el('h3',{style:{margin:'0',fontSize:'16px',color:'var(--text)'}},'⚙️ Gerenciar Rotinas'),
        el('button',{class:'btn-ghost',style:{padding:'4px 10px'},onclick:function(){setState({dailyTemplatesOpen:false});}},'✕'),
      ]),
      btn('btn-primary','+ Nova Rotina',function(){setState({dailyModal:{},dailyTemplatesOpen:false});}),
      el('div',{style:{marginTop:'14px',overflowY:'auto',flex:'1'}},lista),
    ])
  ]);
}

// ── card de tarefa ────────────────────────────────────────────────────────────
function _doCard(op){
  var alerta=_doDeveAlertar(op);
  var corMap={gold:'var(--gold)',blue:'var(--blue)',green:'var(--green)',red:'var(--red)',purple:'#9c59b6'};
  var cor=corMap[op.cor||'gold']||'var(--gold)';
  var priIcon={alta:'🔴',media:'🟡',baixa:'🟢'}[op.prioridade||'media'];

  var cardStyle={
    background:'var(--bg3)',borderRadius:'8px',padding:'12px',marginBottom:'8px',
    borderLeft:'3px solid '+cor,
    border:'1px solid '+(alerta?cor:'var(--border)'),
    transition:'border-color .3s',
  };
  if(alerta)cardStyle.animation='doPulse 1.4s ease-in-out infinite';

  var hdr=el('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'4px'}},[
    el('div',{style:{fontWeight:'600',fontSize:'13px',color:'var(--text)',flex:'1',marginRight:'6px',lineHeight:'1.3'}},
      (alerta?'⚠️ ':priIcon+' ')+op.nome),
    op.horario?el('span',{style:{fontSize:'11px',color:'var(--text3)',whiteSpace:'nowrap',fontWeight:'700',fontFamily:'monospace'}},op.horario):null,
  ].filter(Boolean));

  var desc=op.descricao?el('div',{style:{fontSize:'12px',color:'var(--text3)',marginBottom:'8px',lineHeight:'1.4'}},op.descricao):null;

  var alertTag=alerta?el('div',{style:{
    fontSize:'11px',fontWeight:'700',color:'var(--gold)',marginBottom:'8px',textAlign:'center',letterSpacing:'.5px',
    padding:'4px 8px',background:'rgba(229,172,0,.12)',borderRadius:'4px',
  }},'⏰ HORA DA TAREFA!'):null;

  var pendInfo=op.status==='pendente'?el('div',{style:{
    fontSize:'11px',color:'var(--red)',marginBottom:'8px',padding:'4px 8px',
    background:'rgba(224,82,82,.1)',borderRadius:'4px',
  }},'📅 Era para: '+_doFmtData(op.data)+' · Atrasada '+_doAtrasoLabel(op)):null;

  var adiInfo=(op.status==='adiada'&&op.adiada)?el('div',{style:{fontSize:'11px',color:'var(--text3)',marginBottom:'6px'}},
    '↻ Para: '+_doFmtData(op.adiada.para)+(op.adiada.motivo?' — "'+op.adiada.motivo+'"':'')):null;

  var doneInfo=op.status==='concluida'?el('div',{style:{fontSize:'11px',color:'var(--green)',marginBottom:'4px',fontWeight:'600'}},
    '✓ Concluída às '+_doFmtHoraISO(op.concluidaEm)):null;

  var cancInfo=op.status==='cancelada'?el('div',{style:{fontSize:'11px',color:'var(--text3)',marginBottom:'4px'}},
    '✕ Cancelada'+(op.motivoCancelamento?' — "'+op.motivoCancelamento+'"':'')):null;

  var btns=[];
  if(op.status==='hoje'||op.status==='pendente'||op.status==='adiada'){
    btns.push(el('button',{style:{
      padding:'5px 10px',borderRadius:'6px',border:'none',background:'var(--green)',
      color:'#fff',fontSize:'12px',fontWeight:'700',cursor:'pointer',
    },onclick:function(){_doConcluir(op.id);}},'✓ Concluir'));
    btns.push(el('button',{style:{
      padding:'5px 10px',borderRadius:'6px',border:'1px solid var(--border)',
      background:'var(--bg2)',color:'var(--text)',fontSize:'12px',cursor:'pointer',
    },onclick:function(){setState({dailyAdiModal:op.id});}},'↻ Adiar'));
    btns.push(el('button',{style:{
      padding:'5px 8px',borderRadius:'6px',border:'1px solid var(--border)',
      background:'none',color:'var(--text3)',fontSize:'12px',cursor:'pointer',
    },title:'Remover',onclick:function(){_doExcluir(op.id);}},'🗑'));
  }

  var actions=btns.length?el('div',{style:{display:'flex',gap:'5px',marginTop:'8px',flexWrap:'wrap'}},btns):null;
  return el('div',{style:cardStyle},[hdr,desc,alertTag,pendInfo,adiInfo,doneInfo,cancInfo,actions].filter(Boolean));
}

// ── coluna kanban ─────────────────────────────────────────────────────────────
function _doColuna(titulo,icone,cor,cards){
  return el('div',{style:{
    background:'var(--bg2)',borderRadius:'10px',padding:'12px',
    border:'1px solid var(--border)',display:'flex',flexDirection:'column',minWidth:'220px',
  }},[
    el('div',{style:{display:'flex',alignItems:'center',gap:'7px',marginBottom:'12px',paddingBottom:'10px',borderBottom:'1px solid var(--border)'}},[
      el('span',{style:{fontSize:'16px'}},icone),
      el('span',{style:{fontWeight:'700',fontSize:'13px',color:'var(--text)',flex:'1'}},titulo),
      el('span',{style:{fontSize:'11px',fontWeight:'700',padding:'2px 7px',borderRadius:'10px',background:cor+'22',color:cor}},String(cards.length)),
    ]),
    cards.length===0
      ?el('div',{style:{color:'var(--text3)',fontSize:'12px',textAlign:'center',padding:'24px 0',opacity:'.5'}},'Nenhuma tarefa')
      :el('div',{style:{maxHeight:'60vh',overflowY:'auto'}},cards),
  ]);
}

// ── render principal ──────────────────────────────────────────────────────────
function renderDailyOperation(){
  if(_doTimerRef)clearInterval(_doTimerRef);
  _doTimerRef=setInterval(function(){
    if(state.page==='daily')setState({_doTick:Date.now()});
    else{clearInterval(_doTimerRef);_doTimerRef=null;}
  },60000);

  _doInit();

  var pf=state.profile,hj=today();
  var ops=(state.dailyOps||[]).filter(function(op){return op.profile===pf;});

  var opHoje=ops.filter(function(op){return op.status==='hoje'&&op.data===hj;}).sort(function(a,b){
    if(!a.horario&&!b.horario)return 0;if(!a.horario)return 1;if(!b.horario)return -1;
    return a.horario<b.horario?-1:1;
  });
  var opConc=ops.filter(function(op){return op.status==='concluida'&&op.data===hj;}).sort(function(a,b){
    return(b.concluidaEm||'')>(a.concluidaEm||'')?1:-1;
  });
  var opPend=ops.filter(function(op){return op.status==='pendente';}).sort(function(a,b){
    return a.data<b.data?-1:1;
  });
  var opCancAdiad=ops.filter(function(op){return op.status==='cancelada'||op.status==='adiada';});

  // Data display
  var dObj=new Date(hj+'T12:00:00');
  var DIAS_SEM=['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
  var MESES_NM=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  var dataDisplay=DIAS_SEM[dObj.getDay()]+', '+dObj.getDate()+' de '+MESES_NM[dObj.getMonth()]+' de '+dObj.getFullYear();

  var hora=_doHora();
  var dentroHorario=hora>='06:00'&&hora<='18:00';
  var total=opHoje.length+opConc.length;
  var pct=total>0?Math.round((opConc.length/total)*100):0;

  // Header stats
  var headerStats=el('div',{style:{
    display:'flex',alignItems:'center',gap:'14px',flexWrap:'wrap',
    background:'var(--bg2)',borderRadius:'10px',padding:'14px 18px',
    border:'1px solid var(--border)',marginBottom:'12px',
  }},[
    el('div',{style:{flex:'1',minWidth:'180px'}},[
      el('div',{style:{fontWeight:'700',fontSize:'15px',color:'var(--text)'}},dataDisplay),
      el('div',{style:{fontSize:'12px',color:dentroHorario?'var(--green)':'var(--text3)',marginTop:'3px'}},
        dentroHorario?('⏰ '+hora+' · Horário comercial ativo'):('⏰ '+hora+' · Fora do horário comercial (06:00–18:00)')),
    ]),
    el('div',{style:{display:'flex',gap:'14px',alignItems:'center',flexWrap:'wrap'}},[
      el('div',{style:{textAlign:'center'}},[
        el('div',{style:{fontSize:'24px',fontWeight:'800',color:'var(--green)',lineHeight:'1'}},String(opConc.length)),
        el('div',{style:{fontSize:'11px',color:'var(--text3)',marginTop:'2px'}},'Concluídas'),
      ]),
      el('div',{style:{textAlign:'center'}},[
        el('div',{style:{fontSize:'24px',fontWeight:'800',color:'var(--gold)',lineHeight:'1'}},String(opHoje.length)),
        el('div',{style:{fontSize:'11px',color:'var(--text3)',marginTop:'2px'}},'A fazer'),
      ]),
      opPend.length>0?el('div',{style:{textAlign:'center'}},[
        el('div',{style:{fontSize:'24px',fontWeight:'800',color:'var(--red)',lineHeight:'1'}},String(opPend.length)),
        el('div',{style:{fontSize:'11px',color:'var(--red)',marginTop:'2px'}},'Atrasadas'),
      ]):null,
      total>0?el('div',{style:{
        background:pct===100?'var(--green)':pct>=50?'var(--gold)':'var(--bg3)',
        color:pct===100||pct<50?'var(--text)':'#000',
        borderRadius:'20px',padding:'6px 16px',fontWeight:'800',fontSize:'15px',
      }},pct+'%'):null,
    ].filter(Boolean)),
  ]);

  // Barra de progresso
  var progBar=total>0?el('div',{style:{height:'5px',borderRadius:'3px',background:'var(--bg3)',marginBottom:'12px',overflow:'hidden'}},[
    el('div',{style:{width:pct+'%',height:'100%',borderRadius:'3px',background:pct===100?'var(--green)':'var(--gold)',transition:'width .5s ease'}}),
  ]):null;

  // Action bar
  var actionBar=el('div',{style:{display:'flex',gap:'8px',marginBottom:'14px',flexWrap:'wrap'}},[
    btn('btn-primary','+ Tarefa Rápida',function(){setState({dailyModal:{oneOff:true}});}),
    btn('btn-ghost','+ Nova Rotina Diária',function(){setState({dailyModal:{}});}),
    btn('btn-ghost','⚙️ Rotinas',function(){setState({dailyTemplatesOpen:true});}),
  ]);

  // Kanban
  var board=el('div',{style:{
    display:'grid',
    gridTemplateColumns:'repeat(4,minmax(210px,1fr))',
    gap:'12px',alignItems:'start',
  }},[
    _doColuna('Tarefa do Dia','📋','var(--gold)',opHoje.map(_doCard)),
    _doColuna('Concluídas','✅','var(--green)',opConc.map(_doCard)),
    _doColuna('Pendentes','⏰','var(--red)',opPend.map(_doCard)),
    _doColuna('Cancelada / Adiada','🚫','var(--text3)',opCancAdiad.map(_doCard)),
  ]);

  return div('',[
    div('page-header',[
      el('h1',{},'Daily Operation'),
      el('p',{},'Diário de bordo · Checklist operacional diário · 06:00–18:00'),
    ]),
    headerStats,
    progBar,
    actionBar,
    board,
  ].filter(Boolean));
}
