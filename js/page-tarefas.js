function setupTarefasNotificacoes() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    Notification.requestPermission();
  }
  verificarAlertas();
  setInterval(verificarAlertas, 60000);
}

function verificarAlertas() {
  if (!state.tarefas || Notification.permission !== 'granted') return;
  var agora = new Date();
  var tarefas = state.tarefas.filter(function(t) {
    return (!t.profile || t.profile === state.profile) && t.status === 'pendente' && !t.notificado;
  });
  tarefas.forEach(function(t) {
    if (!t.data) return;
    var dataHora = t.hora ? new Date(t.data + 'T' + t.hora) : new Date(t.data + 'T23:59:59');
    var lembreteMs = (t.lembrete_antecipado || 0) * 60000;
    var alertTime = new Date(dataHora.getTime() - lembreteMs);
    if (agora >= alertTime) {
      var body = t.descricao || ('Vence em: ' + fmtDate(t.data) + (t.hora ? ' ' + t.hora : ''));
      try {
        new Notification(t.titulo, { body: body, requireInteraction: true, tag: 'tarefa_' + t.id });
      } catch(e) {}
      state.tarefas = state.tarefas.map(function(x) {
        return x.id === t.id ? Object.assign({}, x, { notificado: true }) : x;
      });
      lsSet('tarefas', state.tarefas);
    }
  });
}

function renderAlertaBanner() {
  if (!state.tarefas) return null;
  var agora = new Date();
  var todayStr = today();
  var alertas = state.tarefas.filter(function(t) {
    if (!t || t.status !== 'pendente') return false;
    if (!(!t.profile || t.profile === state.profile)) return false;
    if (!t.data) return false;
    if (t.data < todayStr) return true;
    if (t.data === todayStr) {
      if (t.lembrete_antecipado && t.hora) {
        var dataHora = new Date(t.data + 'T' + t.hora);
        var lembreteMs = t.lembrete_antecipado * 60000;
        var alertTime = new Date(dataHora.getTime() - lembreteMs);
        if (agora >= alertTime) return true;
      }
      if (!t.hora) return true;
    }
    return false;
  });
  if (!alertas.length) return null;

  var banner = div('', []);
  banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9000;background:linear-gradient(90deg,#7a1a1a,#b8860b);color:#fff;padding:10px 16px;box-shadow:0 4px 16px rgba(0,0,0,.5)';

  var header = div('', [
    el('strong', {}, '⚠ ' + alertas.length + ' tarefa' + (alertas.length > 1 ? 's' : '') + ' requer' + (alertas.length > 1 ? 'em' : '') + ' atenção'),
  ]);
  header.style.cssText = 'font-size:14px;font-weight:700;margin-bottom:6px';
  banner.appendChild(header);

  var lista = div('', []);
  lista.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px';

  alertas.forEach(function(t) {
    var diasAtrasado = Math.floor((new Date(todayStr) - new Date(t.data)) / 86400000);
    var item = div('', []);
    item.style.cssText = 'display:flex;align-items:center;gap:8px;background:rgba(0,0,0,.25);border-radius:6px;padding:5px 10px';

    var txt = el('span', {}, t.titulo + (diasAtrasado > 0 ? ' — ' + diasAtrasado + ' dia' + (diasAtrasado > 1 ? 's' : '') + ' atraso' : ' — hoje'));
    txt.style.cssText = 'font-size:12px';
    item.appendChild(txt);

    var verBtn = el('button', {}, '→ Ver tarefa');
    verBtn.style.cssText = 'background:rgba(255,255,255,.2);border:none;color:#fff;border-radius:4px;padding:3px 8px;font-size:11px;font-weight:600;cursor:pointer';
    verBtn.onclick = (function(tid) {
      return function() {
        setState({ page: 'tarefas', concluirModal: { tarefaId: tid } });
      };
    })(t.id);
    item.appendChild(verBtn);
    lista.appendChild(item);
  });

  banner.appendChild(lista);
  return banner;
}

function renderTarefas() {
  var tarefas = (state.tarefas || []).filter(function(t) {
    return !t.profile || t.profile === state.profile;
  });
  var todayStr = today();
  var now = new Date();
  var nowMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  var in30 = new Date(now.getTime() + 30 * 86400000).toISOString().split('T')[0];

  var tipoIcon = { tarefa: '📋', lembrete: '🔔', reuniao: '🗓', prazo: '⏰' };
  var prioridadeColor = { baixa: 'var(--text3)', normal: 'var(--blue)', alta: 'var(--gold)', urgente: 'var(--red)' };
  var prioridadeBg = { baixa: 'var(--bg3)', normal: 'var(--blue-dim)', alta: 'var(--gold-dim)', urgente: 'var(--red-dim)' };

  var containers = [];

  if (state.concluirModal) {
    var cModal = state.concluirModal;
    var cTarefa = (state.tarefas || []).find(function(t) { return t.id === cModal.tarefaId; });
    if (cTarefa) {
      var notaInput = el('textarea', { class: 'form-input', placeholder: 'Descreva o que foi feito, resultado, observações...' });
      notaInput.style.cssText = 'min-height:100px;resize:vertical';

      var confirmBtn = btn('btn-primary', '✓ Confirmar conclusão', function() {
        var nota = notaInput.value.trim();
        if (!nota) { showToast('Descreva o que foi feito antes de concluir.', 'error'); return; }
        var updated = (state.tarefas || []).map(function(t) {
          return t.id === cTarefa.id ? Object.assign({}, t, { status: 'concluido', dataConclusao: today(), notaConclusao: nota, notificado: true }) : t;
        });
        lsSet('tarefas', updated);
        setState({ tarefas: updated, concluirModal: null });
        scheduleSave();
        showToast('Tarefa concluída!');
      });

      var cancelarBtn = btn('btn-ghost', '✕ Cancelar tarefa', function() {
        var updated = (state.tarefas || []).map(function(t) {
          return t.id === cTarefa.id ? Object.assign({}, t, { status: 'cancelado', dataConclusao: today(), notaConclusao: notaInput.value.trim() || 'Cancelada', notificado: true }) : t;
        });
        lsSet('tarefas', updated);
        setState({ tarefas: updated, concluirModal: null });
        scheduleSave();
        showToast('Tarefa cancelada', 'error');
      });
      cancelarBtn.style.color = 'var(--red)';

      var closeBtn = btn('modal-close', '×', function() { setState({ concluirModal: null }); });

      var modal = div('modal', [
        div('modal-title', [
          el('span', {}, 'Concluir: ' + cTarefa.titulo),
          closeBtn,
        ]),
        div('form-group', [
          el('label', { class: 'form-label' }, 'Nota de conclusão (obrigatório)'),
          notaInput,
        ]),
        div('modal-actions', [cancelarBtn, confirmBtn]),
      ]);

      var overlay = div('modal-overlay', [modal]);
      overlay.onclick = function(e) { if (e.target === overlay) setState({ concluirModal: null }); };
      containers.push(overlay);
    }
  }

  if (state.tarefaModal !== null && state.tarefaModal !== undefined) {
    var modalData = state.tarefaModal || {};
    var editItem = modalData.editItem || null;
    var isEdit = !!editItem;

    var fTitulo = el('input', { class: 'form-input', type: 'text', placeholder: 'Ex: Pagar aluguel, Reunião com fornecedor...', value: isEdit ? (editItem.titulo || '') : '' });
    var fDesc = el('textarea', { class: 'form-input', placeholder: 'Descrição opcional...' });
    fDesc.style.minHeight = '60px';
    if (isEdit) fDesc.value = editItem.descricao || '';

    var fTipo = el('select', { class: 'form-input' }, [
      el('option', { value: 'tarefa' }, '📋 Tarefa'),
      el('option', { value: 'lembrete' }, '🔔 Lembrete'),
      el('option', { value: 'reuniao' }, '🗓 Reunião'),
      el('option', { value: 'prazo' }, '⏰ Prazo'),
    ]);
    fTipo.value = isEdit ? (editItem.tipo || 'tarefa') : 'tarefa';

    var prioBtns = div('', []);
    prioBtns.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap';
    var prioOpts = [
      { value: 'baixa', label: '⬇ Baixa' },
      { value: 'normal', label: '➡ Normal' },
      { value: 'alta', label: '⬆ Alta' },
      { value: 'urgente', label: '🔴 Urgente' },
    ];
    var prioAtual = isEdit ? (editItem.prioridade || 'normal') : 'normal';
    var prioSelected = { value: prioAtual };

    prioOpts.forEach(function(opt) {
      var b = el('button', {}, opt.label);
      b.style.cssText = 'padding:5px 10px;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;border:1px solid var(--border);transition:all .15s';
      if (prioAtual === opt.value) {
        b.style.background = prioridadeBg[opt.value];
        b.style.color = prioridadeColor[opt.value];
        b.style.borderColor = prioridadeColor[opt.value];
      } else {
        b.style.background = 'transparent';
        b.style.color = 'var(--text2)';
      }
      b.onclick = function() {
        prioSelected.value = opt.value;
        prioBtns.querySelectorAll('button').forEach(function(pb) {
          pb.style.background = 'transparent';
          pb.style.color = 'var(--text2)';
          pb.style.borderColor = 'var(--border)';
        });
        b.style.background = prioridadeBg[opt.value];
        b.style.color = prioridadeColor[opt.value];
        b.style.borderColor = prioridadeColor[opt.value];
      };
      prioBtns.appendChild(b);
    });

    var fData = el('input', { class: 'form-input', type: 'date', value: isEdit ? (editItem.data || todayStr) : todayStr });
    var fHora = el('input', { class: 'form-input', type: 'time', value: isEdit ? (editItem.hora || '') : '' });

    var fLembrete = el('select', { class: 'form-input' }, [
      el('option', { value: '0' }, 'Sem lembrete'),
      el('option', { value: '15' }, '15 min antes'),
      el('option', { value: '30' }, '30 min antes'),
      el('option', { value: '60' }, '1 hora antes'),
      el('option', { value: '120' }, '2 horas antes'),
      el('option', { value: '1440' }, '1 dia antes'),
      el('option', { value: '4320' }, '3 dias antes'),
      el('option', { value: '10080' }, '7 dias antes'),
    ]);
    fLembrete.value = String(isEdit ? (editItem.lembrete_antecipado || 0) : 0);

    var recorrenciaExtra = div('', []);
    recorrenciaExtra.style.display = 'none';

    var fRecTipo = el('select', { class: 'form-input' }, [
      el('option', { value: 'diario' }, 'Diário'),
      el('option', { value: 'semanal' }, 'Semanal'),
      el('option', { value: 'mensal' }, 'Mensal'),
      el('option', { value: 'anual' }, 'Anual'),
    ]);
    fRecTipo.value = isEdit ? (editItem.recorrencia_tipo || 'mensal') : 'mensal';

    var fRecFim = el('select', { class: 'form-input' }, [
      el('option', { value: 'nunca' }, 'Nunca'),
      el('option', { value: 'data' }, 'Em data específica'),
      el('option', { value: 'ocorrencias' }, 'Após X ocorrências'),
    ]);
    fRecFim.value = isEdit ? (editItem.recorrencia_fim || 'nunca') : 'nunca';

    var fRecFimData = el('input', { class: 'form-input', type: 'date', value: isEdit ? (editItem.recorrencia_fim_data || '') : '' });
    var fRecFimOc = el('input', { class: 'form-input', type: 'number', value: isEdit ? String(editItem.recorrencia_fim_ocorrencias || 12) : '12' });
    fRecFimOc.min = '1';

    var recFimExtra = div('', []);
    recFimExtra.style.marginTop = '8px';
    recFimExtra.style.display = 'none';

    function updateRecFimExtra() {
      recFimExtra.innerHTML = '';
      var v = fRecFim.value;
      if (v === 'data') {
        recFimExtra.style.display = '';
        recFimExtra.appendChild(el('label', { class: 'form-label' }, 'Data de término'));
        recFimExtra.appendChild(fRecFimData);
      } else if (v === 'ocorrencias') {
        recFimExtra.style.display = '';
        recFimExtra.appendChild(el('label', { class: 'form-label' }, 'Número de ocorrências'));
        recFimExtra.appendChild(fRecFimOc);
      } else {
        recFimExtra.style.display = 'none';
      }
    }
    fRecFim.onchange = updateRecFimExtra;
    updateRecFimExtra();

    recorrenciaExtra.appendChild(div('form-group', [el('label', { class: 'form-label' }, 'Repetição'), fRecTipo]));
    recorrenciaExtra.appendChild(div('form-group', [el('label', { class: 'form-label' }, 'Terminar'), fRecFim, recFimExtra]));

    var fRecorrente = el('input', { type: 'checkbox' });
    fRecorrente.checked = isEdit ? !!editItem.recorrente : false;
    fRecorrente.onchange = function() {
      recorrenciaExtra.style.display = fRecorrente.checked ? '' : 'none';
    };
    if (fRecorrente.checked) recorrenciaExtra.style.display = '';

    var recLabelWrap = div('', [fRecorrente, el('span', { style: 'margin-left:6px;font-size:13px' }, 'Tarefa recorrente')]);
    recLabelWrap.style.display = 'flex';
    recLabelWrap.style.alignItems = 'center';
    recLabelWrap.style.gap = '4px';

    var saveBtn = btn('btn-primary', isEdit ? '💾 Salvar' : '＋ Criar tarefa', function() {
      var titulo = fTitulo.value.trim();
      if (!titulo) { showToast('O título é obrigatório.', 'error'); return; }
      var item = Object.assign({}, isEdit ? editItem : {}, {
        id: isEdit ? editItem.id : ('task_' + Date.now()),
        titulo: titulo,
        descricao: fDesc.value.trim(),
        tipo: fTipo.value,
        prioridade: prioSelected.value,
        data: fData.value || todayStr,
        hora: fHora.value,
        lembrete_antecipado: parseInt(fLembrete.value) || 0,
        recorrente: fRecorrente.checked,
        recorrencia_tipo: fRecTipo.value,
        recorrencia_fim: fRecFim.value,
        recorrencia_fim_data: fRecFimData.value,
        recorrencia_fim_ocorrencias: parseInt(fRecFimOc.value) || 12,
        status: isEdit ? (editItem.status || 'pendente') : 'pendente',
        dataConclusao: isEdit ? (editItem.dataConclusao || '') : '',
        notaConclusao: isEdit ? (editItem.notaConclusao || '') : '',
        notificado: isEdit ? (editItem.notificado || false) : false,
        profile: state.profile,
      });
      if (!isEdit) item.recorrencia_intervalo = 1;
      var updated = isEdit
        ? (state.tarefas || []).map(function(t) { return t.id === item.id ? item : t; })
        : (state.tarefas || []).concat([item]);
      lsSet('tarefas', updated);
      setState({ tarefas: updated, tarefaModal: null });
      scheduleSave();
      showToast(isEdit ? 'Tarefa atualizada!' : 'Tarefa criada!');
    });

    var cancelBtn = btn('btn-ghost', 'Cancelar', function() { setState({ tarefaModal: null }); });
    var mCloseBtn = btn('modal-close', '×', function() { setState({ tarefaModal: null }); });

    var dataRow = div('form-row', [
      div('form-group', [el('label', { class: 'form-label' }, 'Data'), fData]),
      div('form-group', [el('label', { class: 'form-label' }, 'Hora'), fHora]),
    ]);

    var modal2 = div('modal', [
      div('modal-title', [el('span', {}, isEdit ? 'Editar tarefa' : 'Nova tarefa'), mCloseBtn]),
      div('form-group', [el('label', { class: 'form-label' }, 'Título'), fTitulo]),
      div('form-group', [el('label', { class: 'form-label' }, 'Descrição'), fDesc]),
      div('form-group', [el('label', { class: 'form-label' }, 'Tipo'), fTipo]),
      div('form-group', [el('label', { class: 'form-label' }, 'Prioridade'), prioBtns]),
      dataRow,
      div('form-group', [el('label', { class: 'form-label' }, 'Lembrete antecipado'), fLembrete]),
      div('form-group', [el('label', { class: 'form-label' }, 'Recorrência'), recLabelWrap, recorrenciaExtra]),
      div('modal-actions', [cancelBtn, saveBtn]),
    ]);

    var overlay2 = div('modal-overlay', [modal2]);
    overlay2.onclick = function(e) { if (e.target === overlay2) setState({ tarefaModal: null }); };
    containers.push(overlay2);
  }

  var pendentes = tarefas.filter(function(t) { return t.status === 'pendente'; });
  var atrasadas = pendentes.filter(function(t) { return t.data < todayStr; }).sort(function(a, b) { return a.data < b.data ? -1 : 1; });
  var hoje = pendentes.filter(function(t) { return t.data === todayStr; });
  var proximas = pendentes.filter(function(t) { return t.data > todayStr && t.data <= in30; }).sort(function(a, b) { return a.data < b.data ? -1 : 1; });
  var concluidas = tarefas.filter(function(t) { return t.status === 'concluido'; }).slice(-20).reverse();

  var now2 = new Date();
  var semFim = new Date(now2.getTime() + 7 * 86400000).toISOString().split('T')[0];
  var estaSemana = pendentes.filter(function(t) { return t.data >= todayStr && t.data <= semFim; });
  var concluidosMes = tarefas.filter(function(t) { return t.status === 'concluido' && t.dataConclusao && t.dataConclusao.startsWith(nowMonth); });

  function kpiCard(color, label, value) {
    var card = div('kpi-card ' + color, [
      div('kpi-label', [label]),
      div('kpi-value ' + color, [String(value)]),
    ]);
    return card;
  }

  var kpis = div('kpi-grid', [
    kpiCard('gold', 'Pendentes hoje', hoje.length),
    kpiCard('red', 'Atrasadas', atrasadas.length),
    kpiCard('blue', 'Esta semana', estaSemana.length),
    kpiCard('green', 'Concluídas', concluidosMes.length),
  ]);

  function diasDiff(dataStr) {
    return Math.ceil((new Date(dataStr) - new Date(todayStr)) / 86400000);
  }

  function tarefaCard(t, showConcluida) {
    var dias = diasDiff(t.data);
    var diasText;
    if (t.status === 'concluido') {
      diasText = 'Concluída em ' + fmtDate(t.dataConclusao);
    } else if (dias < 0) {
      diasText = Math.abs(dias) + ' dia' + (Math.abs(dias) > 1 ? 's' : '') + ' atraso';
    } else if (dias === 0) {
      diasText = 'Hoje';
    } else {
      diasText = 'Em ' + dias + ' dia' + (dias > 1 ? 's' : '');
    }

    var badge = el('span', {}, t.prioridade || 'normal');
    badge.style.cssText = 'padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;text-transform:uppercase';
    badge.style.background = prioridadeBg[t.prioridade] || prioridadeBg.normal;
    badge.style.color = prioridadeColor[t.prioridade] || prioridadeColor.normal;

    var descPreview = t.descricao ? el('div', {}, t.descricao.length > 80 ? t.descricao.slice(0, 80) + '...' : t.descricao) : null;
    descPreview && (descPreview.style.cssText = 'font-size:12px;color:var(--text2);margin-top:2px');

    var metaRow = div('', []);
    metaRow.style.cssText = 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:4px';
    var dtSpan = el('span', {}, (tipoIcon[t.tipo] || '📋') + ' ' + fmtDate(t.data) + (t.hora ? ' ' + t.hora : ''));
    dtSpan.style.cssText = 'font-size:11px;color:var(--text3)';
    var diasSpan = el('span', {}, diasText);
    diasSpan.style.cssText = 'font-size:11px;font-weight:600;color:' + (t.status === 'concluido' ? 'var(--green)' : dias < 0 ? 'var(--red)' : dias === 0 ? 'var(--gold)' : 'var(--text3)');
    metaRow.appendChild(dtSpan);
    metaRow.appendChild(diasSpan);
    metaRow.appendChild(badge);
    if (t.recorrente) {
      var recIcon = el('span', {}, '🔄');
      recIcon.style.cssText = 'font-size:11px;color:var(--text3)';
      metaRow.appendChild(recIcon);
    }

    var actions = div('', []);
    actions.style.cssText = 'display:flex;align-items:center;gap:4px;flex-shrink:0';

    if (t.status === 'concluido') {
      if (t.notaConclusao) {
        var notaPreview = el('div', {}, '📝 ' + (t.notaConclusao.length > 60 ? t.notaConclusao.slice(0, 60) + '...' : t.notaConclusao));
        notaPreview.style.cssText = 'font-size:11px;color:var(--green);margin-top:4px';
      }
      var delBtnC = btn('btn-icon', '🗑', function() {
        if (!window.confirm('Remover esta tarefa?')) return;
        var updated = (state.tarefas || []).filter(function(x) { return x.id !== t.id; });
        lsSet('tarefas', updated);
        setState({ tarefas: updated });
        scheduleSave();
        showToast('Tarefa removida', 'error');
      });
      actions.appendChild(delBtnC);
    } else {
      var concluirBtn = btn('btn-primary', '✓ Concluir', function() {
        setState({ concluirModal: { tarefaId: t.id } });
      });
      concluirBtn.style.cssText = 'padding:5px 10px;font-size:12px';

      var editBtnEl = btn('btn-icon edit', '✏️', function() {
        setState({ tarefaModal: { editItem: Object.assign({}, t) } });
      });

      var delBtnP = btn('btn-icon', '🗑', function() {
        if (!window.confirm('Remover esta tarefa?')) return;
        var updated = (state.tarefas || []).filter(function(x) { return x.id !== t.id; });
        lsSet('tarefas', updated);
        setState({ tarefas: updated });
        scheduleSave();
        showToast('Tarefa removida', 'error');
      });

      actions.appendChild(concluirBtn);
      actions.appendChild(editBtnEl);
      actions.appendChild(delBtnP);
    }

    var cardTop = div('', []);
    cardTop.style.cssText = 'display:flex;align-items:flex-start;justify-content:space-between;gap:8px';

    var left = div('', []);
    left.style.flex = '1';
    left.style.minWidth = '0';

    var titleEl = el('div', {}, t.titulo);
    titleEl.style.cssText = 'font-size:13px;font-weight:600;color:var(--text)';
    left.appendChild(titleEl);
    if (descPreview) left.appendChild(descPreview);
    if (t.status === 'concluido' && t.notaConclusao) {
      var np = el('div', {}, '📝 ' + (t.notaConclusao.length > 60 ? t.notaConclusao.slice(0, 60) + '...' : t.notaConclusao));
      np.style.cssText = 'font-size:11px;color:var(--green);margin-top:4px';
      left.appendChild(np);
    }

    cardTop.appendChild(left);
    cardTop.appendChild(actions);

    var card = div('card', [cardTop, metaRow]);
    card.style.marginBottom = '8px';
    if (t.status === 'pendente' && t.data < todayStr) {
      card.style.borderColor = 'var(--red)';
      card.style.borderLeftWidth = '3px';
    } else if (t.status === 'concluido') {
      card.style.opacity = '0.8';
    }
    return card;
  }

  function section(icon, title, items, showConcluida) {
    if (!items.length) return null;
    var header = div('', [
      el('span', {}, icon + ' ' + title),
      el('span', {}, String(items.length)),
    ]);
    header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;font-size:13px;font-weight:700;margin-bottom:10px;margin-top:20px;padding-bottom:6px;border-bottom:1px solid var(--border)';
    var cards = items.map(function(t) { return tarefaCard(t, showConcluida); });
    var wrap = div('', [header].concat(cards));
    return wrap;
  }

  var allPendingEmpty = !atrasadas.length && !hoje.length && !proximas.length;

  var concluiBody = div('', concluidas.map(function(t) { return tarefaCard(t, true); }));
  concluiBody.style.display = 'none';
  var concluiToggleBtn = btn('btn-ghost', '✅ Concluídas (' + concluidas.length + ') ▼', function() {
    var open = concluiBody.style.display !== 'none';
    concluiBody.style.display = open ? 'none' : '';
    concluiToggleBtn.textContent = (open ? '✅ Concluídas (' + concluidas.length + ') ▼' : '✅ Concluídas (' + concluidas.length + ') ▲');
  });
  concluiToggleBtn.style.cssText = 'font-size:13px;font-weight:700;padding:6px 0;margin-top:20px;display:block';

  var secAtrasadas = section('🔴', 'Atrasadas', atrasadas);
  var secHoje = section('📅', 'Hoje', hoje);
  var secProximas = section('📆', 'Próximas (30 dias)', proximas);

  var emptyState = null;
  if (allPendingEmpty) {
    emptyState = div('empty', [
      div('empty-icon', ['🎉']),
      div('empty-title', ['Tudo em dia!']),
      el('p', {}, 'Nenhuma tarefa pendente. Continue assim!'),
    ]);
  }

  var novaBtn = btn('btn-primary', '+ Nova tarefa', function() {
    setState({ tarefaModal: {} });
  });

  var pageHeader = div('action-row', [
    div('page-header', [el('h1', {}, '📋 Tarefas')]),
    novaBtn,
  ]);

  var contentChildren = [pageHeader, kpis];
  if (emptyState) contentChildren.push(emptyState);
  if (secAtrasadas) contentChildren.push(secAtrasadas);
  if (secHoje) contentChildren.push(secHoje);
  if (secProximas) contentChildren.push(secProximas);
  if (concluidas.length) {
    contentChildren.push(concluiToggleBtn);
    contentChildren.push(concluiBody);
  }

  var content = div('content', contentChildren);
  var page = div('main', [renderTopbar(), content]);

  var root = div('', [page].concat(containers));
  root.style.display = 'contents';
  return root;
}
