// ── VENDAS DO DIA — exclusivo Artt Burger ────────────────────────────────────
function renderVendas(){
  if(state.profile!=='artt'){
    setState({page:'dashboard'});
    return div('');
  }

  var taxas=state.taxas||TAXAS_DEFAULT;
  var dataSel=state.vendasData||today();
  var vendaId='venda_'+dataSel;
  var atual=(state.vendas||[]).find(function(v){return v.id===vendaId;})||null;

  // Labels de data
  var ontem=new Date();ontem.setDate(ontem.getDate()-1);
  var ontemStr=ontem.toISOString().split('T')[0];
  var dObj=new Date(dataSel+'T12:00:00');
  var DIAS=['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
  var MESES_FULL=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  var dateDisplay=DIAS[dObj.getDay()]+', '+dObj.getDate()+' de '+MESES_FULL[dObj.getMonth()]+' de '+dObj.getFullYear();
  var dateTag=dataSel===today()?'HOJE':dataSel===ontemStr?'ONTEM':'';

  function navDate(delta){
    var d=new Date(dataSel+'T12:00:00');
    d.setDate(d.getDate()+delta);
    setState({vendasData:d.toISOString().split('T')[0]});
  }

  // Formas de pagamento PDV
  var PAGS=[
    {key:'dinheiro',     label:'Dinheiro',               icon:'💵'},
    {key:'pix',          label:'Pix',                    icon:'⚡'},
    {key:'credito',      label:'Cartão Crédito',         icon:'💳'},
    {key:'debito',       label:'Cartão Débito',          icon:'💳'},
    {key:'notinha',      label:'Notinha Funcionários',   icon:'🧾'},
    {key:'ifood_online', label:'Pagamento Online iFood', icon:'🟢'},
    {key:'yooga',        label:'Pagamento Online Yooga', icon:'🟣'},
  ];

  function calcLiq(bruto,taxa){
    return Math.max(0,Math.round(bruto*(1-(taxa||0)/100)*100)/100);
  }

  function getVal(k){return atual&&atual.pdv?atual.pdv[k]||0:0;}

  // Atualiza totais no DOM sem re-render
  function updateTotals(){
    var tBruto=0,tTaxas=0;
    PAGS.forEach(function(p){
      var inp=document.getElementById('inp_'+p.key);
      var b=inp?parseFloat(inp.value)||0:0;
      tBruto+=b;
      tTaxas+=b*(taxas[p.key]||0)/100;
    });
    var tLiq=tBruto-tTaxas;
    var eB=document.getElementById('tot_bruto');
    var eT=document.getElementById('tot_taxas');
    var eL=document.getElementById('tot_liq');
    if(eB)eB.textContent=fmtMoney(tBruto);
    if(eT)eT.textContent=fmtMoney(tTaxas);
    if(eL)eL.textContent=fmtMoney(tLiq);
  }

  // Linha de input com líquido ao vivo
  function inputRow(p){
    var taxa=taxas[p.key]||0;
    var brutoVal=getVal(p.key);
    var liqId='liq_'+p.key;

    var liqEl=el('span',{id:liqId,style:{
      fontSize:'13px',fontWeight:'700',color:'var(--green)',
      minWidth:'100px',textAlign:'right',flexShrink:'0'
    }},fmtMoney(calcLiq(brutoVal,taxa)));

    var inp=el('input',{
      type:'number',class:'form-input',id:'inp_'+p.key,
      min:'0',step:'0.01',placeholder:'0,00',
      style:{width:'120px',fontSize:'13px',padding:'7px 10px',textAlign:'right'},
      oninput:function(e){
        var b=parseFloat(e.target.value)||0;
        var lEl=document.getElementById(liqId);
        if(lEl)lEl.textContent=fmtMoney(calcLiq(b,taxa));
        updateTotals();
      }
    });
    if(brutoVal)inp.value=String(brutoVal);

    var taxaBadge=el('span',{style:{
      fontSize:'10px',fontWeight:'700',color:taxa>0?'var(--gold)':'var(--text3)',
      background:'var(--bg3)',padding:'2px 7px',borderRadius:'10px',flexShrink:'0',minWidth:'36px',textAlign:'center'
    }},taxa+'%');

    return el('div',{style:{
      display:'flex',alignItems:'center',gap:'12px',
      padding:'10px 0',borderBottom:'1px solid var(--border)'
    }},[
      el('span',{style:{fontSize:'16px',width:'24px',textAlign:'center',flexShrink:'0'}},p.icon),
      el('span',{style:{flex:'1',fontSize:'13px',color:'var(--text2)',fontWeight:'500'}},p.label),
      taxaBadge,
      inp,
      liqEl,
    ]);
  }

  // ── FORMULÁRIO PDV ────────────────────────────────────────────────────────
  var colHeader=el('div',{style:{
    display:'flex',justifyContent:'flex-end',gap:'12px',
    marginBottom:'6px',fontSize:'10px',fontWeight:'700',
    textTransform:'uppercase',letterSpacing:'.5px',color:'var(--text3)'
  }},[
    el('span',{style:{minWidth:'36px',textAlign:'center'}},'Taxa'),
    el('span',{style:{width:'120px',textAlign:'right'}},'Valor bruto'),
    el('span',{style:{width:'100px',textAlign:'right'}},'Líquido'),
  ]);

  var formCard=div('card',[
    el('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'4px'}},[
      div('card-title','PDV — Formas de Pagamento'),
      el('span',{style:{fontSize:'11px',color:'var(--text3)'}},'Bruto → desconto da taxa → líquido'),
    ]),
    colHeader,
    ...PAGS.map(inputRow),
  ]);

  // ── RESUMO ────────────────────────────────────────────────────────────────
  var resumo=el('div',{style:{
    display:'grid',gridTemplateColumns:'1fr 1fr 1fr',
    gap:'12px',marginBottom:'14px'
  }},[
    el('div',{class:'kpi-card'},[
      el('div',{class:'kpi-label'},'Total Bruto'),
      el('div',{class:'kpi-value',id:'tot_bruto'},fmtMoney(0)),
      el('div',{class:'kpi-sub'},'Antes das taxas'),
    ]),
    el('div',{class:'kpi-card red'},[
      el('div',{class:'kpi-label'},'Total Taxas'),
      el('div',{class:'kpi-value red',id:'tot_taxas'},fmtMoney(0)),
      el('div',{class:'kpi-sub'},'Descontado'),
    ]),
    el('div',{class:'kpi-card green'},[
      el('div',{class:'kpi-label'},'Total Líquido'),
      el('div',{class:'kpi-value green',id:'tot_liq'},fmtMoney(0)),
      el('div',{class:'kpi-sub'},'Entra no caixa'),
    ]),
  ]);

  // ── CONFIG TAXAS ──────────────────────────────────────────────────────────
  function taxRow(p){
    var inp=el('input',{
      type:'number',class:'form-input',id:'taxacfg_'+p.key,
      min:'0',max:'100',step:'0.01',
      style:{width:'72px',fontSize:'12px',padding:'5px 8px',textAlign:'right'}
    });
    inp.value=String(taxas[p.key]||0);
    return el('div',{style:{
      display:'flex',alignItems:'center',gap:'10px',
      padding:'7px 0',borderBottom:'1px solid var(--border)'
    }},[
      el('span',{style:{fontSize:'14px',width:'20px',textAlign:'center'}},p.icon),
      el('span',{style:{flex:'1',fontSize:'12px',color:'var(--text2)'}},p.label),
      inp,
      el('span',{style:{fontSize:'12px',color:'var(--text3)'}},'%'),
    ]);
  }

  function salvarTaxas(){
    var novas={};
    PAGS.forEach(function(p){
      var i=document.getElementById('taxacfg_'+p.key);
      novas[p.key]=i?parseFloat(i.value)||0:taxas[p.key]||0;
    });
    lsSet('taxas',novas);
    setState({taxas:novas});
    showToast('Taxas salvas!');
  }

  var taxPanel=div('card',[
    div('card-title','⚙ Configurar taxas por forma de pagamento'),
    el('p',{style:{fontSize:'12px',color:'var(--text3)',marginBottom:'14px',lineHeight:'1.6'}},
      'Configure a taxa de cada forma de pagamento. O valor líquido é calculado automaticamente ao preencher os campos.'),
    ...PAGS.map(taxRow),
    el('div',{style:{marginTop:'14px',display:'flex',justifyContent:'flex-end'}},[
      btn('btn-primary','💾 Salvar taxas',salvarTaxas),
    ]),
  ]);
  taxPanel.id='tax-panel';
  taxPanel.style.display='none';
  taxPanel.style.marginBottom='14px';

  function toggleTaxas(){
    var p=document.getElementById('tax-panel');
    if(p)p.style.display=p.style.display==='none'?'block':'none';
  }

  // ── SALVAR ────────────────────────────────────────────────────────────────
  function salvarVendaDia(){
    var pdv={};
    PAGS.forEach(function(p){
      var i=document.getElementById('inp_'+p.key);
      pdv[p.key]=i?parseFloat(i.value)||0:0;
    });
    var total=Object.values(pdv).reduce(function(s,v){return s+v;},0);
    if(total===0){showToast('Informe ao menos um valor','error');return;}
    var obs=document.getElementById('venda_obs')?document.getElementById('venda_obs').value:'';
    saveVenda({id:vendaId,data:dataSel,profile:'artt',pdv:pdv,obs:obs});
  }

  var obsInp=el('textarea',{
    class:'form-input',id:'venda_obs',rows:'2',
    placeholder:'Observações: promoções, eventos, ocorrências do dia...',
    style:{resize:'vertical',width:'100%'}
  });
  if(atual&&atual.obs)obsInp.value=atual.obs;

  var saveBar=el('div',{style:{
    display:'flex',gap:'12px',alignItems:'flex-end',marginBottom:'14px'
  }},[
    el('div',{style:{flex:'1'}},[
      el('label',{class:'form-label',style:{marginBottom:'6px'}},'Observações (opcional)'),
      obsInp,
    ]),
    el('div',{style:{display:'flex',gap:'8px',flexShrink:'0'}},[
      atual?btn('btn-ghost','🗑 Excluir',function(){
        if(window.confirm('Excluir lançamento de '+fmtDate(dataSel)+'?\nAs receitas geradas serão removidas.')){
          deleteVenda(vendaId);
        }
      }):null,
      btn('btn-primary',atual?'✓ Atualizar lançamento':'✓ Salvar lançamento',salvarVendaDia),
    ].filter(Boolean)),
  ]);

  // ── HISTÓRICO ─────────────────────────────────────────────────────────────
  var historico=(state.vendas||[])
    .filter(function(v){return v.profile==='artt';})
    .sort(function(a,b){return b.data.localeCompare(a.data);})
    .slice(0,45);

  function calcTotais(v){
    var tB=0,tT=0;
    Object.keys(v.pdv||{}).forEach(function(k){
      var b=v.pdv[k]||0;tB+=b;tT+=b*(taxas[k]||0)/100;
    });
    return{bruto:tB,taxas:tT,liq:tB-tT};
  }

  var LABEL_SHORT={dinheiro:'Din',pix:'Pix',credito:'Créd',debito:'Déb',notinha:'Not',ifood_online:'iFood',yooga:'Yooga'};

  var histRows=historico.map(function(v){
    var t=calcTotais(v);
    var isAtivo=v.data===dataSel;
    var formas=Object.keys(v.pdv||{})
      .filter(function(k){return v.pdv[k]>0;})
      .map(function(k){return LABEL_SHORT[k]||k;})
      .join(' · ')||'—';

    return el('tr',{
      style:{background:isAtivo?'var(--gold-dim)':'',cursor:'pointer'},
      onmouseenter:function(e){if(!isAtivo)e.currentTarget.style.background='var(--bg3)';},
      onmouseleave:function(e){if(!isAtivo)e.currentTarget.style.background='';},
      onclick:function(){setState({vendasData:v.data});}
    },[
      el('td',{style:{padding:'8px 10px',fontSize:'12px',fontWeight:isAtivo?'700':'400'}},[
        fmtDate(v.data),
        v.data===today()?el('span',{style:{marginLeft:'5px',fontSize:'10px',color:'var(--blue)'}},'●'):null,
      ].filter(Boolean)),
      el('td',{style:{padding:'8px 10px',fontSize:'11px',color:'var(--text3)'}},formas),
      el('td',{style:{padding:'8px 10px',fontSize:'12px',textAlign:'right'}},fmtMoney(t.bruto)),
      el('td',{style:{padding:'8px 10px',fontSize:'12px',textAlign:'right',color:'var(--red)'}},t.taxas>0?'-'+fmtMoney(t.taxas):'—'),
      el('td',{style:{padding:'8px 10px',fontSize:'13px',fontWeight:'700',textAlign:'right',color:'var(--green)'}},fmtMoney(t.liq)),
    ]);
  });

  var histCard=div('card',[
    el('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}},[
      div('card-title','Histórico de lançamentos'),
      el('span',{style:{fontSize:'11px',color:'var(--text3)'}},'Clique em um dia para editar'),
    ]),
    historico.length===0
      ?div('empty',[
          div('empty-icon','📋'),
          div('empty-title','Nenhum lançamento ainda'),
          el('p',{style:{fontSize:'12px',color:'var(--text3)'}},'Faça o primeiro lançamento acima'),
        ])
      :el('div',{style:{overflowX:'auto'}},[
          el('table',{style:{width:'100%',borderCollapse:'collapse'}},[
            el('thead',{},[el('tr',{style:{borderBottom:'2px solid var(--border)'}},[
              el('th',{style:{padding:'7px 10px',textAlign:'left',fontSize:'11px',color:'var(--text3)',fontWeight:'700',textTransform:'uppercase'}},'Data'),
              el('th',{style:{padding:'7px 10px',textAlign:'left',fontSize:'11px',color:'var(--text3)',fontWeight:'700',textTransform:'uppercase'}},'Formas'),
              el('th',{style:{padding:'7px 10px',textAlign:'right',fontSize:'11px',color:'var(--text3)',fontWeight:'700',textTransform:'uppercase'}},'Bruto'),
              el('th',{style:{padding:'7px 10px',textAlign:'right',fontSize:'11px',color:'var(--text3)',fontWeight:'700',textTransform:'uppercase'}},'Taxas'),
              el('th',{style:{padding:'7px 10px',textAlign:'right',fontSize:'11px',color:'var(--text3)',fontWeight:'700',textTransform:'uppercase'}},'Líquido'),
            ])]),
            el('tbody',{},histRows),
          ]),
        ]),
  ]);

  // Inicializa totais após render (carrega valores existentes)
  setTimeout(updateTotals,50);

  return div('',[
    div('page-header',[
      el('h1',{},'🛒 Vendas do Dia'),
      el('p',{},'Lançamento diário de caixa · Artt Burger'),
    ]),

    // Navegação de data
    el('div',{style:{
      display:'flex',alignItems:'center',gap:'12px',marginBottom:'14px',
      background:'var(--bg2)',border:'1px solid var(--border)',
      borderRadius:'var(--radius)',padding:'12px 16px'
    }},[
      btn('btn-ghost','←',function(){navDate(-1);}),
      el('div',{style:{flex:'1',textAlign:'center'}},[
        el('div',{style:{fontSize:'14px',fontWeight:'700',color:'var(--text)'}},dateDisplay),
        el('div',{style:{display:'flex',alignItems:'center',justifyContent:'center',gap:'8px',marginTop:'5px'}},[
          dateTag?el('span',{style:{
            fontSize:'10px',fontWeight:'800',textTransform:'uppercase',letterSpacing:'1px',
            color:'var(--gold)',background:'var(--gold-dim)',padding:'2px 8px',borderRadius:'10px'
          }},dateTag):null,
          atual
            ?el('span',{style:{fontSize:'11px',color:'var(--green)'}},'✓ Lançamento salvo')
            :el('span',{style:{fontSize:'11px',color:'var(--text3)'}},'Sem lançamento para este dia'),
        ].filter(Boolean)),
      ]),
      btn('btn-ghost','→',function(){navDate(1);}),
      el('button',{
        class:'btn-ghost',
        style:{fontSize:'12px',padding:'6px 12px',color:'var(--text3)',flexShrink:'0'},
        onclick:toggleTaxas
      },'⚙ Taxas'),
    ]),

    taxPanel,
    resumo,
    formCard,
    saveBar,
    histCard,
  ]);
}
