// ── MODAL COMPRA ──────────────────────────────────────────────────────────────

function renderCompraModal() {
  var m = state.compraModal;
  if (!m) return null;

  var edit   = m.editItem || {};
  var isEdit = !!edit.id;

  function g(id) {
    var e = document.getElementById('cm-' + id);
    return e ? e.value : '';
  }

  function mkInp(id, type, ph, val) {
    var i = el('input', { class: 'form-input', type: type || 'text', id: 'cm-' + id, placeholder: ph || '' });
    if (val !== undefined && val !== null && val !== '') i.value = String(val);
    return i;
  }

  function mkSel(id, optsArr, selVal) {
    var s = el('select', { class: 'form-input', id: 'cm-' + id });
    optsArr.forEach(function(o) {
      var v = typeof o === 'string' ? o : o.v;
      var l = typeof o === 'string' ? o : o.l;
      var opt = el('option', { value: v }, l);
      if (v === selVal) opt.selected = true;
      s.appendChild(opt);
    });
    return s;
  }

  function fg(label, child) {
    return div('form-group', [el('label', { class: 'form-label' }, label), child]);
  }

  // recalcula valor total ao mudar qtd ou preço
  function recalc() {
    var q = parseFloat((document.getElementById('cm-quantidade') || {}).value) || 0;
    var p = parseFloat((document.getElementById('cm-precoUnit')  || {}).value) || 0;
    var t = document.getElementById('cm-valorTotal');
    if (t && q > 0 && p > 0) t.value = (q * p).toFixed(2);
  }

  // Fornecedores do perfil
  var forns = (state.fornecedores || []).filter(function(f) {
    return !f.profile || f.profile === state.profile;
  });
  var fornOpts = [{ v: '', l: '— Selecionar —' }].concat(forns.map(function(f) {
    return { v: f.id, l: f.nome };
  }));

  // Bancos do perfil
  var bancoOpts = [{ v: '', l: '— Conta —' }].concat(
    (state.bancos || []).filter(function(b) { return b.profile === state.profile; })
      .map(function(b) { return { v: b.id, l: b.nome }; })
  );

  var catOpts = ['— Categoria —'].concat(_COMPRAS_CATS);

  var statusOpts = [
    { v: 'pendente', l: 'Pendente' },
    { v: 'pago',     l: 'Pago'     },
    { v: 'cancelado',l: 'Cancelado'},
  ];

  function save() {
    var itemNome = g('item').trim();
    if (!itemNome) { showToast('Informe o nome do item', 'error'); return; }
    var dataC = g('dataCompra');
    if (!dataC)    { showToast('Informe a data da compra', 'error'); return; }

    var cat       = g('categoria');
    var fornId    = g('fornecedorId');
    var fornNome  = g('fornecedorNome').trim();
    var qtd       = parseFloat(g('quantidade')) || 0;
    var und       = g('unidade');
    var precoU    = parseFloat(g('precoUnit'))  || 0;
    var total     = parseFloat(g('valorTotal')) || (qtd * precoU);
    var dataV     = g('dataVencimento');
    var dataE     = g('dataEntrega');
    var forma     = g('formaPagamento');
    var banco     = g('banco');
    var status    = g('status') || 'pendente';
    var nf        = g('nf').trim();
    var obs       = g('obs').trim();

    // resolve nome do fornecedor
    if (fornId) {
      var fObj = forns.find(function(f) { return f.id === fornId; });
      if (fObj) fornNome = fObj.nome;
    }

    var compra = {
      id:             edit.id || uid(),
      profile:        state.profile,
      item:           itemNome,
      categoria:      cat === '— Categoria —' ? '' : cat,
      fornecedorId:   fornId,
      fornecedor:     fornNome,
      quantidade:     qtd,
      unidade:        und,
      precoUnit:      precoU,
      valorTotal:     total || 0,
      dataCompra:     dataC,
      dataVencimento: dataV,
      dataEntrega:    dataE,
      formaPagamento: forma,
      banco:          banco,
      status:         status,
      nf:             nf,
      obs:            obs,
      criadoEm:       edit.criadoEm || new Date().toISOString(),
    };

    var lista = state.compras || [];
    if (isEdit) {
      lista = lista.map(function(x) { return x.id === compra.id ? compra : x; });
    } else {
      lista = lista.concat([compra]);
    }
    lsSet('compras', lista);
    setState({ compras: lista, compraModal: null });
    scheduleSave();
    showToast(isEdit ? 'Compra atualizada!' : 'Compra registrada!');
  }

  function excluir() {
    if (!confirm('Excluir esta compra?')) return;
    var lista = (state.compras || []).filter(function(x) { return x.id !== edit.id; });
    lsSet('compras', lista);
    setState({ compras: lista, compraModal: null });
    scheduleSave();
    showToast('Compra excluída', 'error');
  }

  // Campos de quantidade + unidade em linha
  var qtdRow = el('div', { style: { display: 'flex', gap: '8px' } });
  var qtdInp = mkInp('quantidade', 'number', '1', edit.quantidade);
  qtdInp.setAttribute('min', '0');
  qtdInp.setAttribute('step', 'any');
  qtdInp.oninput = recalc;
  qtdRow.appendChild(el('div', { style: { flex: '2' } }, [qtdInp]));
  qtdRow.appendChild(el('div', { style: { flex: '1' } }, [mkSel('unidade', _COMPRAS_UNIDADES, edit.unidade || 'un')]));

  // Preço + Total em linha
  var precoRow = el('div', { style: { display: 'flex', gap: '8px' } });
  var puInp = mkInp('precoUnit', 'number', '0,00', edit.precoUnit);
  puInp.setAttribute('min', '0');
  puInp.setAttribute('step', '0.01');
  puInp.oninput = recalc;
  var totInp = mkInp('valorTotal', 'number', '0,00', edit.valorTotal);
  totInp.setAttribute('min', '0');
  totInp.setAttribute('step', '0.01');
  precoRow.appendChild(el('div', { style: { flex: '1' } }, [el('label', { class: 'form-label' }, 'Preço unitário (R$)'), puInp]));
  precoRow.appendChild(el('div', { style: { flex: '1' } }, [el('label', { class: 'form-label' }, 'Valor total (R$)'), totInp]));

  // Datas
  var datasRow = el('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' } });
  datasRow.appendChild(el('div', {}, [el('label', { class: 'form-label' }, 'Data da compra *'), mkInp('dataCompra', 'date', '', edit.dataCompra || today())]));
  datasRow.appendChild(el('div', {}, [el('label', { class: 'form-label' }, 'Vencimento'),        mkInp('dataVencimento', 'date', '', edit.dataVencimento || '')]));
  datasRow.appendChild(el('div', {}, [el('label', { class: 'form-label' }, 'Prev. entrega'),     mkInp('dataEntrega', 'date', '', edit.dataEntrega || '')]));

  // Forma pag + banco
  var pagRow = el('div', { style: { display: 'flex', gap: '8px' } });
  pagRow.appendChild(el('div', { style: { flex: '1' } }, [el('label', { class: 'form-label' }, 'Forma de pagamento'), mkSel('formaPagamento', _COMPRAS_FORMAS, edit.formaPagamento || 'Pix')]));
  pagRow.appendChild(el('div', { style: { flex: '1' } }, [el('label', { class: 'form-label' }, 'Conta debitada'), mkSel('banco', bancoOpts, edit.banco || '')]));

  // Status + NF
  var compRow = el('div', { style: { display: 'flex', gap: '8px' } });
  compRow.appendChild(el('div', { style: { flex: '1' } }, [el('label', { class: 'form-label' }, 'Status'), mkSel('status', statusOpts, edit.status || 'pendente')]));
  compRow.appendChild(el('div', { style: { flex: '1' } }, [el('label', { class: 'form-label' }, 'NF / Pedido'), mkInp('nf', 'text', 'Ex: NF 00123', edit.nf || '')]));

  // Obs
  var obsEl = el('textarea', { class: 'form-input', id: 'cm-obs', placeholder: 'Observações...', rows: '2' });
  obsEl.value = edit.obs || '';

  var modal = div('modal', [
    div('modal-title', [
      el('span', {}, isEdit ? '✏️ Editar compra' : '🛒 Nova compra'),
      el('button', { class: 'modal-close', onclick: function() { setState({ compraModal: null }); } }, '×'),
    ]),
    el('div', { style: { maxHeight: '72vh', overflowY: 'auto' } }, [

      // Bloco item
      el('div', { style: { borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '12px' } }, [
        el('div', { style: { fontSize: '11px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '8px' } }, '📦 Item'),
        fg('Nome do item *', mkInp('item', 'text', 'Ex: Óleo de soja, Embalagem...', edit.item || '')),
        fg('Categoria', mkSel('categoria', catOpts, edit.categoria || '')),
        el('div', { style: { display: 'flex', gap: '8px' } }, [
          el('div', { style: { flex: '1' } }, [el('label', { class: 'form-label' }, 'Fornecedor (cadastrado)'), mkSel('fornecedorId', fornOpts, edit.fornecedorId || '')]),
          el('div', { style: { flex: '1' } }, [el('label', { class: 'form-label' }, 'Ou nome livre'), mkInp('fornecedorNome', 'text', 'Ex: Atacadão...', edit.fornecedor || '')]),
        ]),
      ]),

      // Bloco quantidade/valor
      el('div', { style: { borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '12px' } }, [
        el('div', { style: { fontSize: '11px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '8px' } }, '📐 Quantidade e Valores'),
        fg('Quantidade + Unidade', qtdRow),
        precoRow,
      ]),

      // Bloco datas/pagamento
      el('div', { style: { borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '12px' } }, [
        el('div', { style: { fontSize: '11px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '8px' } }, '📅 Datas e Pagamento'),
        fg('Datas', datasRow),
        pagRow,
      ]),

      // Bloco complemento
      el('div', {}, [
        el('div', { style: { fontSize: '11px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '8px' } }, '📋 Complemento'),
        compRow,
        fg('Observações', obsEl),
      ]),
    ]),
    div('modal-actions', [
      isEdit ? btn('btn-ghost', '🗑️ Excluir', excluir) : null,
      btn('btn-ghost', 'Cancelar', function() { setState({ compraModal: null }); }),
      btn('btn-primary', isEdit ? '💾 Salvar' : '✅ Registrar', save),
    ].filter(Boolean)),
  ]);
  modal.style.maxWidth = '600px';

  var ov = div('modal-overlay', [modal]);
  ov.onclick = function(e) { if (e.target === ov) setState({ compraModal: null }); };
  return ov;
}
