// ── APOSTAS ESPORTIVAS ────────────────────────────────────────────────────────

var AE_ESPORTES = [
  {id:'futebol',   label:'⚽ Futebol'},
  {id:'basquete',  label:'🏀 Basquete'},
  {id:'tenis',     label:'🎾 Tênis'},
  {id:'volei',     label:'🏐 Vôlei'},
  {id:'mma',       label:'🥊 MMA / UFC'},
  {id:'formula1',  label:'🏎️ Fórmula 1'},
  {id:'esports',   label:'🎮 eSports'},
  {id:'outros',    label:'🏅 Outros'},
];

var AE_MERCADOS = [
  'Resultado Final (1X2)',
  'Dupla Chance',
  'Ambas Marcam',
  'Over/Under Gols',
  'Handicap Asiático',
  'Handicap Europeu',
  'Primeiro Gol / Último Gol',
  'Placar Correto',
  'Chance Mista',
  'Total de Cantos',
  'Total de Cartões',
  'Money Line',
  'Spread',
  'Total de Pontos',
  'Vencedor do Set',
  'Outros',
];

var AE_BANCAS = [
  'Bet365','Betano','EstrelaBet','Sportingbet','KTO','Betfair',
  'Pinnacle','1xBet','Superbet','Vaidebet','Outros',
];

// ── CÁLCULOS ──────────────────────────────────────────────────────────────────
function aeCalcLucro(aposta){
  if(aposta.resultado==='ganhou') return Math.round((aposta.odd*aposta.stake - aposta.stake)*100)/100;
  if(aposta.resultado==='perdeu') return -Math.round(aposta.stake*100)/100;
  if(aposta.resultado==='void')   return 0;
  return 0;
}

function aeStats(apostas, pf){
  var lista=apostas.filter(function(a){return a.profile===pf;});
  var encerradas=lista.filter(function(a){return a.resultado&&a.resultado!=='aberta';});
  var ganhou=encerradas.filter(function(a){return a.resultado==='ganhou';}).length;
  var perdeu=encerradas.filter(function(a){return a.resultado==='perdeu';}).length;
  var void_=encerradas.filter(function(a){return a.resultado==='void';}).length;
  var totalStake=encerradas.reduce(function(s,a){return s+(a.stake||0);},0);
  var totalLucro=encerradas.reduce(function(s,a){return s+aeCalcLucro(a);},0);
  var roi=totalStake>0?Math.round(totalLucro/totalStake*10000)/100:0;
  var winRate=encerradas.length>0?Math.round(ganhou/(encerradas.length-void_)*10000)/100:0;
  var abertas=lista.filter(function(a){return !a.resultado||a.resultado==='aberta';}).length;
  return{lista:lista,encerradas:encerradas,ganhou:ganhou,perdeu:perdeu,void_:void_,
    totalStake:totalStake,totalLucro:totalLucro,roi:roi,winRate:winRate,abertas:abertas};
}

// ── MODAL REGISTRO ────────────────────────────────────────────────────────────
function renderApostaModal(){
  var m=state.apostaModal; if(!m)return null;
  var edit=m.editItem||{};
  var isEdit=!!edit.id;

  function g(id){var e=document.getElementById('ae-'+id);return e?e.value:'';}

  function sel(id,opts,val,ph){
    var s=el('select',{class:'form-input',id:'ae-'+id});
    if(ph)s.appendChild(el('option',{value:''},ph));
    opts.forEach(function(o){
      var v=typeof o==='object'?o.id:o;
      var l=typeof o==='object'?o.label:o;
      var op=el('option',{value:v},l);
      if(v===String(val||''))op.selected=true;
      s.appendChild(op);
    });
    return s;
  }
  function inp(id,type,ph,val){
    var i=el('input',{class:'form-input',type:type||'text',id:'ae-'+id,placeholder:ph||''});
    i.value=val!==undefined?String(val):'';
    return i;
  }

  function salvar(){
    var data=g('data')||today();
    var esporte=g('esporte');
    var evento=g('evento').trim();
    var banca=g('banca');
    var mercado=g('mercado');
    var odd=parseFloat(g('odd'))||0;
    var stake=parseFloat(g('stake'))||0;
    var resultado=g('resultado');
    var notas=g('notas').trim();

    if(!evento){_fldErr('ae-evento','Informe o evento');showToast('Preencha os campos em vermelho','error');return;}
    if(!odd||odd<1){_fldErr('ae-odd','Odd deve ser >= 1.00');showToast('Preencha os campos em vermelho','error');return;}
    if(!stake||stake<=0){_fldErr('ae-stake','Informe o valor apostado');showToast('Preencha os campos em vermelho','error');return;}

    var nova={
      id:edit.id||uid(),
      data:data,
      esporte:esporte,
      evento:evento,
      banca:banca,
      mercado:mercado,
      odd:odd,
      stake:stake,
      resultado:resultado||'aberta',
      notas:notas,
      profile:state.profile,
    };

    var arr=isEdit
      ?(state.apostas||[]).map(function(a){return a.id===nova.id?nova:a;})
      :(state.apostas||[]).concat([nova]);

    lsSet('apostas',arr);
    setState({apostas:arr,apostaModal:null});
    scheduleSave();
    if(typeof logAudit==='function') logAudit(isEdit?'editou aposta':'registrou aposta',nova.evento+' | Odd '+nova.odd+' | R$'+nova.stake);
    showToast(isEdit?'Aposta atualizada!':'Aposta registrada!');
  }

  var resultadoOpts=[
    {id:'aberta',  label:'⏳ Em aberto'},
    {id:'ganhou',  label:'✅ Ganhou'},
    {id:'perdeu',  label:'❌ Perdeu'},
    {id:'void',    label:'↩️ Void / Devolvido'},
  ];

  return el('div',{class:'modal-overlay',onclick:function(e){if(e.target===this)setState({apostaModal:null});}},
    el('div',{class:'modal',style:{maxWidth:'500px'}},[
      el('div',{class:'modal-header'},[
        el('h3',{class:'modal-title'},(isEdit?'✏️ Editar':'🎯 Nova')+' Aposta'),
        el('button',{class:'modal-close',onclick:function(){setState({apostaModal:null});}},'✕'),
      ]),
      el('div',{class:'modal-body'},[
        el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}},[
          el('div',{class:'form-group'},[el('label',{class:'form-label'},'Data'),inp('data','date','',edit.data||today())]),
          el('div',{class:'form-group'},[el('label',{class:'form-label'},'Esporte'),sel('esporte',AE_ESPORTES,edit.esporte,'— Esporte —')]),
        ]),
        el('div',{class:'form-group'},[el('label',{class:'form-label'},'Evento / Partida'),inp('evento','text','Ex: Flamengo x Palmeiras',edit.evento||'')]),
        el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}},[
          el('div',{class:'form-group'},[el('label',{class:'form-label'},'Banca / Casa'),sel('banca',AE_BANCAS,edit.banca,'— Banca —')]),
          el('div',{class:'form-group'},[el('label',{class:'form-label'},'Mercado'),sel('mercado',AE_MERCADOS,edit.mercado,'— Mercado —')]),
        ]),
        el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'12px'}},[
          el('div',{class:'form-group'},[el('label',{class:'form-label'},'Odd'),inp('odd','number','1.90',edit.odd||'')]),
          el('div',{class:'form-group'},[el('label',{class:'form-label'},'Stake (R$)'),inp('stake','number','0,00',edit.stake||'')]),
          el('div',{class:'form-group'},[el('label',{class:'form-label'},'Resultado'),sel('resultado',resultadoOpts,edit.resultado||'aberta')]),
        ]),
        el('div',{class:'form-group'},[el('label',{class:'form-label'},'Notas'),el('textarea',{class:'form-input',id:'ae-notas',rows:'2',placeholder:'Análise, motivo da aposta...'},edit.notas||'')]),
      ]),
      el('div',{class:'modal-footer'},[
        btn('btn-secondary','Cancelar',function(){setState({apostaModal:null});}),
        btn('btn-primary',isEdit?'💾 Salvar':'✅ Registrar',salvar),
      ]),
    ])
  );
}

// ── PÁGINA PRINCIPAL ──────────────────────────────────────────────────────────
function renderApostas(){
  var pf=state.profile;
  var st=aeStats(state.apostas||[],pf);
  var filtro=state.apostaFiltro||'todas';
  var busca=(state.apostaBusca||'').toLowerCase().trim();

  var lista=st.lista.filter(function(a){
    if(filtro==='abertas')return !a.resultado||a.resultado==='aberta';
    if(filtro==='ganhou')return a.resultado==='ganhou';
    if(filtro==='perdeu')return a.resultado==='perdeu';
    if(filtro==='void')return a.resultado==='void';
    return true;
  }).filter(function(a){
    if(!busca)return true;
    return (a.evento||'').toLowerCase().includes(busca)||(a.esporte||'').toLowerCase().includes(busca)||(a.banca||'').toLowerCase().includes(busca)||(a.mercado||'').toLowerCase().includes(busca);
  }).sort(function(a,b){return (b.data||'').localeCompare(a.data||'');});

  // ── KPI cards ─────────────────────────────────────────────────────────────
  var lucroColor=st.totalLucro>=0?'#22c55e':'#ef4444';
  var roiColor=st.roi>=0?'#22c55e':'#ef4444';
  var kpiEl=el('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:'12px',marginBottom:'20px'}},[
    el('div',{class:'card',style:{padding:'16px',textAlign:'center',border:'2px solid '+(st.totalLucro>=0?'rgba(34,197,94,.35)':'rgba(239,68,68,.35)')}},[
      el('div',{style:{fontSize:'11px',color:'var(--text3)',marginBottom:'4px',textTransform:'uppercase',letterSpacing:'.7px'}},'Lucro / Prejuízo'),
      el('div',{style:{fontSize:'22px',fontWeight:'900',color:lucroColor}},(st.totalLucro>=0?'+':'')+'R$ '+Math.abs(st.totalLucro).toLocaleString('pt-BR',{minimumFractionDigits:2})),
      el('div',{style:{fontSize:'11px',color:'var(--text3)',marginTop:'4px'}},st.encerradas.length+' apostas encerradas'),
    ]),
    el('div',{class:'card',style:{padding:'16px',textAlign:'center'}},[
      el('div',{style:{fontSize:'11px',color:'var(--text3)',marginBottom:'4px',textTransform:'uppercase',letterSpacing:'.7px'}},'ROI'),
      el('div',{style:{fontSize:'22px',fontWeight:'900',color:roiColor}},(st.roi>=0?'+':'')+st.roi+'%'),
      el('div',{style:{fontSize:'11px',color:'var(--text3)',marginTop:'4px'}},'Retorno sobre investido'),
    ]),
    el('div',{class:'card',style:{padding:'16px',textAlign:'center'}},[
      el('div',{style:{fontSize:'11px',color:'var(--text3)',marginBottom:'4px',textTransform:'uppercase',letterSpacing:'.7px'}},'Taxa de Acerto'),
      el('div',{style:{fontSize:'22px',fontWeight:'900',color:'var(--gold)'}},(isNaN(st.winRate)?'0':st.winRate)+'%'),
      el('div',{style:{fontSize:'11px',color:'var(--text3)',marginTop:'4px'}},st.ganhou+' ganhou · '+st.perdeu+' perdeu'),
    ]),
    el('div',{class:'card',style:{padding:'16px',textAlign:'center'}},[
      el('div',{style:{fontSize:'11px',color:'var(--text3)',marginBottom:'4px',textTransform:'uppercase',letterSpacing:'.7px'}},'Em Aberto'),
      el('div',{style:{fontSize:'22px',fontWeight:'900',color:'#3b82f6'}},String(st.abertas)),
      el('div',{style:{fontSize:'11px',color:'var(--text3)',marginTop:'4px'}},'apostas pendentes'),
    ]),
    el('div',{class:'card',style:{padding:'16px',textAlign:'center'}},[
      el('div',{style:{fontSize:'11px',color:'var(--text3)',marginBottom:'4px',textTransform:'uppercase',letterSpacing:'.7px'}},'Total Investido'),
      el('div',{style:{fontSize:'22px',fontWeight:'900',color:'var(--text)'}},'R$ '+st.totalStake.toLocaleString('pt-BR',{minimumFractionDigits:2})),
      el('div',{style:{fontSize:'11px',color:'var(--text3)',marginTop:'4px'}},'total em stakes'),
    ]),
  ]);

  // ── filtros + busca ────────────────────────────────────────────────────────
  var filtros=['todas','abertas','ganhou','perdeu','void'].map(function(f){
    var labels={todas:'Todas',abertas:'⏳ Abertas',ganhou:'✅ Ganhou',perdeu:'❌ Perdeu',void:'↩️ Void'};
    return el('button',{class:'chip'+(filtro===f?' active':''),onclick:function(){setState({apostaFiltro:f});}},labels[f]||f);
  });

  var searchInp=el('input',{
    id:'_ae_busca',style:{padding:'8px 12px',background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:'8px',color:'var(--text)',fontSize:'13px',width:'200px',outline:'none'},
    placeholder:'🔍 Buscar...',value:state.apostaBusca||'',
  });
  searchInp.oninput=function(){
    var val=this.value;var pos=this.selectionStart;
    state.apostaBusca=val;render();
    var inp=document.getElementById('_ae_busca');
    if(inp){inp.focus();try{inp.setSelectionRange(pos,pos);}catch(e){}}
  };

  var barraFiltros=el('div',{style:{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap',marginBottom:'16px'}},[
    ...filtros,
    el('div',{style:{marginLeft:'auto'}},[searchInp]),
  ]);

  // ── tabela de apostas ──────────────────────────────────────────────────────
  function resBadge(r){
    if(!r||r==='aberta')return el('span',{style:{background:'#1e3a5f',color:'#60a5fa',padding:'2px 8px',borderRadius:'20px',fontSize:'11px',fontWeight:'700'}},'⏳ Aberta');
    if(r==='ganhou')return el('span',{style:{background:'rgba(34,197,94,.18)',color:'#22c55e',padding:'2px 8px',borderRadius:'20px',fontSize:'11px',fontWeight:'700'}},'✅ Ganhou');
    if(r==='perdeu')return el('span',{style:{background:'rgba(239,68,68,.18)',color:'#ef4444',padding:'2px 8px',borderRadius:'20px',fontSize:'11px',fontWeight:'700'}},'❌ Perdeu');
    if(r==='void')return el('span',{style:{background:'rgba(107,114,128,.2)',color:'var(--text3)',padding:'2px 8px',borderRadius:'20px',fontSize:'11px',fontWeight:'700'}},'↩️ Void');
    return el('span',{},r);
  }

  var rows=lista.length===0
    ?[el('tr',{},[el('td',{colspan:'8',style:{textAlign:'center',padding:'40px',color:'var(--text3)'}},'Nenhuma aposta encontrada')])]
    :lista.map(function(a){
      var lucro=aeCalcLucro(a);
      var potRetorno=Math.round(a.odd*a.stake*100)/100;
      return el('tr',{style:{borderBottom:'1px solid var(--border)'}},[
        el('td',{style:{padding:'10px 8px',fontSize:'12px',color:'var(--text3)',whiteSpace:'nowrap'}},a.data?a.data.split('-').reverse().join('/'):'—'),
        el('td',{style:{padding:'10px 8px',fontSize:'13px',fontWeight:'600',color:'var(--text)',maxWidth:'220px'}},[
          el('div',{style:{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}},a.evento||'—'),
          a.mercado?el('div',{style:{fontSize:'11px',color:'var(--text3)',marginTop:'2px'}},a.mercado):null,
        ].filter(Boolean)),
        el('td',{style:{padding:'10px 8px',fontSize:'12px',color:'var(--text3)'}},AE_ESPORTES.find(function(s){return s.id===a.esporte;})?.label||a.esporte||'—'),
        el('td',{style:{padding:'10px 8px',fontSize:'12px',color:'var(--text3)'}},a.banca||'—'),
        el('td',{style:{padding:'10px 8px',fontSize:'13px',fontWeight:'700',color:'var(--gold)',textAlign:'right'}},a.odd?a.odd.toFixed(2):'—'),
        el('td',{style:{padding:'10px 8px',fontSize:'13px',fontWeight:'600',textAlign:'right'}},[
          el('div',{},'R$ '+a.stake.toFixed(2)),
          el('div',{style:{fontSize:'10px',color:'var(--text3)',marginTop:'1px'}},'Ret: R$'+potRetorno.toFixed(2)),
        ]),
        el('td',{style:{padding:'10px 8px',textAlign:'center'}},resBadge(a.resultado)),
        el('td',{style:{padding:'10px 8px',fontSize:'13px',fontWeight:'700',textAlign:'right',color:a.resultado==='ganhou'?'#22c55e':a.resultado==='perdeu'?'#ef4444':'var(--text3)'}},[
          (a.resultado&&a.resultado!=='aberta'&&a.resultado!=='void')
            ?(lucro>=0?'+':'')+fmtMoney(lucro)
            :'—',
        ]),
        el('td',{style:{padding:'10px 8px',textAlign:'center'}},[
          el('button',{class:'btn-icon edit',title:'Editar',onclick:function(){setState({apostaModal:{editItem:Object.assign({},a)}})}}, '✏️'),
          el('button',{class:'btn-icon',title:'Excluir',onclick:function(){
            if(!confirm('Excluir aposta "'+a.evento+'"?'))return;
            var arr=(state.apostas||[]).filter(function(x){return x.id!==a.id;});
            lsSet('apostas',arr);setState({apostas:arr});scheduleSave();showToast('Aposta removida','error');
          }},'🗑️'),
        ]),
      ]);
    });

  var tabela=el('div',{style:{overflowX:'auto'}},[
    el('table',{style:{width:'100%',borderCollapse:'collapse'}},[
      el('thead',{},[el('tr',{style:{borderBottom:'2px solid var(--border)'}},[
        'Data','Evento / Mercado','Esporte','Banca','Odd','Stake','Status','Lucro',''
      ].map(function(h){return el('th',{style:{padding:'10px 8px',fontSize:'11px',color:'var(--text3)',fontWeight:'700',textAlign:['Odd','Stake','Lucro'].includes(h)?'right':'left',whiteSpace:'nowrap'}},h);}))]),
      el('tbody',{},rows),
    ]),
  ]);

  return el('div',{class:'page-content'},[
    el('div',{class:'page-header'},[
      el('div',{},[
        el('h2',{class:'page-title'},'🎯 Minhas Apostas'),
        el('p',{class:'page-sub'},'Registro e desempenho das suas apostas esportivas'),
      ]),
      btn('btn-primary','+ Nova Aposta',function(){setState({apostaModal:{}});}),
    ]),
    kpiEl,
    el('div',{class:'card'},[
      barraFiltros,
      tabela,
    ]),
    state.apostaModal?renderApostaModal():null,
  ].filter(Boolean));
}

// ── DASHBOARD APOSTAS (A>E) ───────────────────────────────────────────────────
function renderDashboardAE(){
  var pf=state.profile;
  var st=aeStats(state.apostas||[],pf);
  var bancos=(state.bancos||[]).filter(function(b){return b.profile===pf;});
  var bancrolTotal=bancos.reduce(function(s,b){return s+(b.saldo||0);},0);
  var contas=(state.contas||[]).filter(function(c){return c.profile===pf;});
  var depositos=contas.filter(function(c){return c.tipo==='pagar'&&c.status!=='pago';}).reduce(function(s,c){return s+(c.valor||0);},0);
  var saques=contas.filter(function(c){return c.tipo==='receber'&&c.status!=='recebido';}).reduce(function(s,c){return s+(c.valor||0);},0);

  // KPI principal
  var lucroColor=st.totalLucro>=0?'#22c55e':'#ef4444';
  var roiColor=st.roi>=0?'#22c55e':'#ef4444';

  var kpiGrid=el('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:'14px',marginBottom:'20px'}},[
    el('div',{class:'card',style:{padding:'18px',background:bancrolTotal>0?'rgba(34,197,94,.06)':'var(--bg3)',border:'2px solid '+(bancrolTotal>0?'rgba(34,197,94,.3)':'var(--border)')}},[
      el('div',{style:{fontSize:'11px',color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.7px',marginBottom:'6px'}},'💰 Bankroll Total'),
      el('div',{style:{fontSize:'26px',fontWeight:'900',color:'#22c55e'}},'R$ '+bancrolTotal.toLocaleString('pt-BR',{minimumFractionDigits:2})),
      el('div',{style:{fontSize:'11px',color:'var(--text3)',marginTop:'6px'}},bancos.length+' banca(s) cadastrada(s)'),
    ]),
    el('div',{class:'card',style:{padding:'18px'}},[
      el('div',{style:{fontSize:'11px',color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.7px',marginBottom:'6px'}},'📈 Lucro Total'),
      el('div',{style:{fontSize:'26px',fontWeight:'900',color:lucroColor}},(st.totalLucro>=0?'+':'')+fmtMoney(st.totalLucro)),
      el('div',{style:{fontSize:'11px',color:'var(--text3)',marginTop:'6px'}},st.encerradas.length+' apostas encerradas'),
    ]),
    el('div',{class:'card',style:{padding:'18px'}},[
      el('div',{style:{fontSize:'11px',color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.7px',marginBottom:'6px'}},'🎯 ROI'),
      el('div',{style:{fontSize:'26px',fontWeight:'900',color:roiColor}},(st.roi>=0?'+':'')+st.roi+'%'),
      el('div',{style:{fontSize:'11px',color:'var(--text3)',marginTop:'6px'}},'Retorno sobre stake'),
    ]),
    el('div',{class:'card',style:{padding:'18px'}},[
      el('div',{style:{fontSize:'11px',color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.7px',marginBottom:'6px'}},'✅ Taxa de Acerto'),
      el('div',{style:{fontSize:'26px',fontWeight:'900',color:'var(--gold)'}},(isNaN(st.winRate)?'0':st.winRate)+'%'),
      el('div',{style:{fontSize:'11px',color:'var(--text3)',marginTop:'6px'}},st.ganhou+'G · '+st.perdeu+'P · '+st.void_+'V'),
    ]),
    el('div',{class:'card',style:{padding:'18px'}},[
      el('div',{style:{fontSize:'11px',color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.7px',marginBottom:'6px'}},'⏳ Em Aberto'),
      el('div',{style:{fontSize:'26px',fontWeight:'900',color:'#3b82f6'}},String(st.abertas)),
      el('div',{style:{fontSize:'11px',color:'var(--text3)',marginTop:'6px'}},'apostas pendentes'),
    ]),
    el('div',{class:'card',style:{padding:'18px'}},[
      el('div',{style:{fontSize:'11px',color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.7px',marginBottom:'6px'}},'💸 Pendências'),
      el('div',{style:{fontSize:'18px',fontWeight:'700',color:'var(--red)'}},fmtMoney(depositos)),
      el('div',{style:{fontSize:'11px',color:'var(--text3)',marginTop:'2px'}},'Depósitos a fazer'),
      el('div',{style:{fontSize:'18px',fontWeight:'700',color:'#22c55e',marginTop:'4px'}},fmtMoney(saques)),
      el('div',{style:{fontSize:'11px',color:'var(--text3)',marginTop:'2px'}},'Saques previstos'),
    ]),
  ]);

  // Últimas apostas
  var ultimas=(state.apostas||[]).filter(function(a){return a.profile===pf;})
    .sort(function(a,b){return (b.data||'').localeCompare(a.data||'');})
    .slice(0,8);

  function resBadgeSm(r){
    if(!r||r==='aberta')return el('span',{style:{color:'#60a5fa',fontSize:'12px'}},'⏳');
    if(r==='ganhou')return el('span',{style:{color:'#22c55e',fontSize:'12px'}},'✅');
    if(r==='perdeu')return el('span',{style:{color:'#ef4444',fontSize:'12px'}},'❌');
    if(r==='void')return el('span',{style:{color:'var(--text3)',fontSize:'12px'}},'↩️');
    return el('span',{},r);
  }

  var ultimasEl=el('div',{class:'card'},[
    el('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 16px',borderBottom:'1px solid var(--border)'}},[
      el('div',{style:{fontSize:'13px',fontWeight:'700',color:'var(--text)'}},'Últimas Apostas'),
      btn('btn-ghost','Ver todas →',function(){setState({page:'apostas'});}),
    ]),
    ultimas.length===0
      ?el('div',{style:{padding:'30px',textAlign:'center',color:'var(--text3)',fontSize:'13px'}},[
          el('div',{style:{fontSize:'32px',marginBottom:'8px'}},'🎯'),
          el('div',{},'Nenhuma aposta registrada ainda'),
          el('div',{style:{marginTop:'10px'}},btn('btn-primary','+ Registrar primeira aposta',function(){setState({apostaModal:{},page:'apostas'});})),
        ])
      :el('div',{},ultimas.map(function(a){
          var lucro=aeCalcLucro(a);
          return el('div',{style:{display:'flex',alignItems:'center',gap:'12px',padding:'10px 16px',borderBottom:'1px solid var(--border)'},
            onmouseenter:function(){this.style.background='var(--bg3)';},
            onmouseleave:function(){this.style.background='';},
          },[
            resBadgeSm(a.resultado),
            el('div',{style:{flex:'1',minWidth:'0'}},[
              el('div',{style:{fontSize:'13px',fontWeight:'600',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}},a.evento||'—'),
              el('div',{style:{fontSize:'11px',color:'var(--text3)',marginTop:'2px'}},(a.banca||'')+(a.mercado?' · '+a.mercado:'')),
            ]),
            el('div',{style:{textAlign:'right',flexShrink:'0'}},[
              el('div',{style:{fontSize:'12px',color:'var(--gold)',fontWeight:'700'}},'@'+a.odd.toFixed(2)),
              el('div',{style:{fontSize:'11px',color:'var(--text3)'}},'R$'+a.stake.toFixed(2)),
            ]),
            (a.resultado&&a.resultado!=='aberta'&&a.resultado!=='void')
              ?el('div',{style:{fontSize:'13px',fontWeight:'700',color:lucro>=0?'#22c55e':'#ef4444',minWidth:'60px',textAlign:'right'}},(lucro>=0?'+':'')+fmtMoney(lucro))
              :el('div',{style:{minWidth:'60px'}}),
          ]);
        })),
  ]);

  // Bancas
  var bancasEl=el('div',{class:'card'},[
    el('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 16px',borderBottom:'1px solid var(--border)'}},[
      el('div',{style:{fontSize:'13px',fontWeight:'700',color:'var(--text)'}},'Saldo por Banca'),
      btn('btn-ghost','Gerenciar →',function(){setState({page:'bancos'});}),
    ]),
    bancos.length===0
      ?el('div',{style:{padding:'20px',textAlign:'center',color:'var(--text3)',fontSize:'12px'}},'Nenhuma banca cadastrada')
      :el('div',{style:{padding:'8px'}},bancos.map(function(b){
          return el('div',{style:{display:'flex',alignItems:'center',gap:'10px',padding:'8px',borderRadius:'8px',marginBottom:'4px'},
            onmouseenter:function(){this.style.background='var(--bg3)';},
            onmouseleave:function(){this.style.background='';},
          },[
            el('div',{style:{width:'10px',height:'10px',borderRadius:'50%',background:b.cor||'var(--gold)',flexShrink:'0'}}),
            el('div',{style:{flex:'1',fontSize:'13px',fontWeight:'500'}},b.nome),
            el('div',{style:{fontSize:'14px',fontWeight:'700',color:(b.saldo||0)>=0?'#22c55e':'#ef4444'}},fmtMoney(b.saldo||0)),
          ]);
        })),
  ]);

  return el('div',{class:'page-content'},[
    el('div',{class:'page-header',style:{marginBottom:'20px'}},[
      el('div',{},[
        el('h2',{class:'page-title'},'⚽ Painel de Apostas'),
        el('p',{class:'page-sub'},'A>E — Apostas Esportivas · Visão geral do desempenho'),
      ]),
      btn('btn-primary','+ Nova Aposta',function(){setState({apostaModal:{},page:'apostas'});}),
    ]),
    kpiGrid,
    el('div',{style:{display:'grid',gridTemplateColumns:'2fr 1fr',gap:'16px'}},[
      ultimasEl,
      bancasEl,
    ]),
  ]);
}
