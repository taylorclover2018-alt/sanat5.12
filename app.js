// ============================================================
// ESTADO GLOBAL
// ============================================================
let veiculosCurvelo = [];
let veiculosSeteLagoas = [];
let contadorVeiculoId = 0;
let barChartInstance = null;
let pieChartInstance = null;
let ultimoResultado = null;

// ============================================================
// FORMATAÇÃO
// ============================================================
function formatarMoeda(valor) {
  if (isNaN(valor) || !isFinite(valor)) valor = 0;
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarData(dataStr) {
  if (!dataStr) return '';
  const [ano, mes, dia] = dataStr.split('-');
  return `${dia}/${mes}/${ano}`;
}

function obterPeriodoTexto() {
  const dataInicial = document.getElementById('dataInicial').value;
  const dataFinal = document.getElementById('dataFinal').value;

  if (!dataInicial) return 'Período não informado';
  if (!dataFinal || dataFinal === dataInicial) {
    return `Dia: ${formatarData(dataInicial)}`;
  }
  return `Período: ${formatarData(dataInicial)} até ${formatarData(dataFinal)}`;
}

// ============================================================
// GERENCIAMENTO DE VEÍCULOS
// ============================================================
function adicionarVeiculo(rota) {
  contadorVeiculoId++;
  const veiculo = {
    id: contadorVeiculoId,
    nome: '',
    diaria: 0,
    dias: 0
  };

  if (rota === 'curvelo') {
    veiculosCurvelo.push(veiculo);
  } else {
    veiculosSeteLagoas.push(veiculo);
  }

  renderizarVeiculos(rota);
}

function removerVeiculo(rota, id) {
  if (rota === 'curvelo') {
    veiculosCurvelo = veiculosCurvelo.filter(v => v.id !== id);
  } else {
    veiculosSeteLagoas = veiculosSeteLagoas.filter(v => v.id !== id);
  }
  renderizarVeiculos(rota);
}

function atualizarVeiculo(rota, id, campo, valor) {
  const lista = rota === 'curvelo' ? veiculosCurvelo : veiculosSeteLagoas;
  const veiculo = lista.find(v => v.id === id);
  if (veiculo) {
    veiculo[campo] = campo === 'nome' ? valor : (parseFloat(valor) || 0);
  }
}

function renderizarVeiculos(rota) {
  const containerId = rota === 'curvelo' ? 'curvelo_veiculos' : 'setelagoas_veiculos';
  const container = document.getElementById(containerId);
  const lista = rota === 'curvelo' ? veiculosCurvelo : veiculosSeteLagoas;

  container.innerHTML = '';

  if (lista.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted); font-size:0.85rem;">Nenhum veículo adicionado.</p>';
    return;
  }

  lista.forEach(v => {
    const div = document.createElement('div');
    div.className = 'vehicle-item';
    div.innerHTML = `
      <div class="field">
        <label>Nome do Veículo (opcional)</label>
        <input type="text" placeholder="Ex: Van 01" value="${v.nome}"
          oninput="atualizarVeiculo('${rota}', ${v.id}, 'nome', this.value)">
      </div>
      <div class="field">
        <label>Valor da Diária (R$)</label>
        <input type="number" min="0" step="0.01" value="${v.diaria}"
          oninput="atualizarVeiculo('${rota}', ${v.id}, 'diaria', this.value)">
      </div>
      <div class="field">
        <label>Dias Rodados</label>
        <input type="number" min="0" step="1" value="${v.dias}"
          oninput="atualizarVeiculo('${rota}', ${v.id}, 'dias', this.value)">
      </div>
      <button type="button" class="btn btn-outline" onclick="removerVeiculo('${rota}', ${v.id})">✕ Remover</button>
    `;
    container.appendChild(div);
  });
}

function somaDiariasVeiculos(rota) {
  const lista = rota === 'curvelo' ? veiculosCurvelo : veiculosSeteLagoas;
  return lista.reduce((total, v) => total + (v.diaria * v.dias), 0);
}

// ============================================================
// COLETA DE DADOS DO FORMULÁRIO
// ============================================================
function coletarDadosRota(prefixo) {
  const val = (id) => parseFloat(document.getElementById(id).value) || 0;

  return {
    alunosIntegrais: val(`${prefixo}_alunosIntegrais`),
    alunosDesconto: val(`${prefixo}_alunosDesconto`),
    descontosPossiveis: val(`${prefixo}_descontosPossiveis`),
    descontosAplicados: val(`${prefixo}_descontosAplicados`),
    valorDesconto: val(`${prefixo}_valorDesconto`),
    totalPassagens: val(`${prefixo}_totalPassagens`)
  };
}

function coletarAuxilio() {
  const tipo = document.querySelector('input[name="tipoAuxilio"]:checked').value;
  return {
    tipo: tipo,
    auxilioTotal: parseFloat(document.getElementById('auxilioTotal').value) || 0,
    auxilioCombustivel: parseFloat(document.getElementById('auxilioCombustivel').value) || 0,
    auxilioFixoCurvelo: parseFloat(document.getElementById('auxilioFixoCurvelo').value) || 0,
    auxilioFixoSeteLagoas: parseFloat(document.getElementById('auxilioFixoSeteLagoas').value) || 0
  };
}

// ============================================================
// CÁLCULOS PRINCIPAIS
// ============================================================
function calcularRota(dados, somaDiarias) {
  const totalAlunos = dados.alunosIntegrais + dados.alunosDesconto;

  const passagensPorAluno = totalAlunos > 0
    ? dados.totalPassagens / totalAlunos
    : 0;

  const receitaIntegrais = dados.alunosIntegrais * passagensPorAluno;
  const receitaDesconto = dados.alunosDesconto * passagensPorAluno;
  const totalDescontosAplicados = dados.descontosAplicados * dados.valorDesconto;
  const totalDiarias = somaDiarias;

  const bruto = receitaIntegrais + receitaDesconto - totalDescontosAplicados + totalDiarias;

  return {
    totalAlunos,
    receitaIntegrais,
    receitaDesconto,
    totalDescontosAplicados,
    totalDiarias,
    bruto
  };
}

function calcularTudo() {
  const dadosCurvelo = coletarDadosRota('curvelo');
  const dadosSeteLagoas = coletarDadosRota('setelagoas');
  const auxilio = coletarAuxilio();

  const diariasCurvelo = somaDiariasVeiculos('curvelo');
  const diariasSeteLagoas = somaDiariasVeiculos('setelagoas');

  const calcCurvelo = calcularRota(dadosCurvelo, diariasCurvelo);
  const calcSeteLagoas = calcularRota(dadosSeteLagoas, diariasSeteLagoas);

  const brutoTotal = calcCurvelo.bruto + calcSeteLagoas.bruto;

  // Percentuais de participação
  const percCurvelo = brutoTotal > 0 ? (calcCurvelo.bruto / brutoTotal) * 100 : 0;
  const percSeteLagoas = brutoTotal > 0 ? (calcSeteLagoas.bruto / brutoTotal) * 100 : 0;

  // Aplicação do auxílio conforme o tipo escolhido
  let auxilioAplicadoCurvelo = 0;
  let auxilioAplicadoSeteLagoas = 0;

  if (auxilio.tipo === 'proporcional') {
    auxilioAplicadoCurvelo = brutoTotal > 0
      ? auxilio.auxilioTotal * (calcCurvelo.bruto / brutoTotal)
      : 0;
    auxilioAplicadoSeteLagoas = brutoTotal > 0
      ? auxilio.auxilioTotal * (calcSeteLagoas.bruto / brutoTotal)
      : 0;
  } else if (auxilio.tipo === 'combustivel') {
    // Combustível somado ao auxílio total, dividido proporcionalmente
    const totalComCombustivel = auxilio.auxilioTotal + auxilio.auxilioCombustivel;
    auxilioAplicadoCurvelo = brutoTotal > 0
      ? totalComCombustivel * (calcCurvelo.bruto / brutoTotal)
      : 0;
    auxilioAplicadoSeteLagoas = brutoTotal > 0
      ? totalComCombustivel * (calcSeteLagoas.bruto / brutoTotal)
      : 0;
  } else if (auxilio.tipo === 'fixo') {
    auxilioAplicadoCurvelo = auxilio.auxilioFixoCurvelo;
    auxilioAplicadoSeteLagoas = auxilio.auxilioFixoSeteLagoas;
  }

  const brutoAposAuxilioCurvelo = calcCurvelo.bruto - auxilioAplicadoCurvelo;
  const brutoAposAuxilioSeteLagoas = calcSeteLagoas.bruto - auxilioAplicadoSeteLagoas;

  // Custo médio por unidade (integral = 1, desconto = fração baseada no valor do desconto vs passagem)
  const custoMedioCurvelo = calcCurvelo.totalAlunos > 0
    ? brutoAposAuxilioCurvelo / calcCurvelo.totalAlunos
    : 0;
  const custoMedioSeteLagoas = calcSeteLagoas.totalAlunos > 0
    ? brutoAposAuxilioSeteLagoas / calcSeteLagoas.totalAlunos
    : 0;

  const resultado = {
    periodo: obterPeriodoTexto(),
    tipoAuxilio: auxilio.tipo,
    curvelo: {
      nome: 'Curvelo',
      dados: dadosCurvelo,
      calc: calcCurvelo,
      auxilioAplicado: auxilioAplicadoCurvelo,
      brutoAposAuxilio: brutoAposAuxilioCurvelo,
      custoMedio: custoMedioCurvelo,
      percentual: percCurvelo
    },
    setelagoas: {
      nome: 'Sete Lagoas',
      dados: dadosSeteLagoas,
      calc: calcSeteLagoas,
      auxilioAplicado: auxilioAplicadoSeteLagoas,
      brutoAposAuxilio: brutoAposAuxilioSeteLagoas,
      custoMedio: custoMedioSeteLagoas,
      percentual: percSeteLagoas
    },
    totais: {
      brutoTotal: brutoTotal,
      auxilioTotalAplicado: auxilioAplicadoCurvelo + auxilioAplicadoSeteLagoas,
      brutoAposAuxilioTotal: brutoAposAuxilioCurvelo + brutoAposAuxilioSeteLagoas
    }
  };

  ultimoResultado = resultado;

  renderizarTabela(resultado);
  renderizarDashboard(resultado);

  document.getElementById('resultsSection').style.display = 'block';
  document.getElementById('dashboardSection').style.display = 'block';
  document.getElementById('pdfSection').style.display = 'block';

  document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ============================================================
// RENDERIZAÇÃO DA TABELA
// ============================================================
function renderizarTabela(resultado) {
  const tbody = document.getElementById('resultTableBody');
  const tfoot = document.getElementById('resultTableFoot');

  tbody.innerHTML = '';
  tfoot.innerHTML = '';

  [resultado.curvelo, resultado.setelagoas].forEach(rota => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${rota.nome}</strong></td>
      <td>${formatarMoeda(rota.calc.bruto)}</td>
      <td>${formatarMoeda(rota.auxilioAplicado)}</td>
      <td>${formatarMoeda(rota.brutoAposAuxilio)}</td>
      <td>${rota.dados.totalPassagens}</td>
      <td>${rota.dados.alunosIntegrais}</td>
      <td>${rota.dados.alunosDesconto}</td>
      <td>${formatarMoeda(rota.custoMedio)}</td>
    `;
    tbody.appendChild(tr);
  });

  const trFoot = document.createElement('tr');
  trFoot.innerHTML = `
    <td>TOTAL GERAL</td>
    <td>${formatarMoeda(resultado.totais.brutoTotal)}</td>
    <td>${formatarMoeda(resultado.totais.auxilioTotalAplicado)}</td>
    <td>${formatarMoeda(resultado.totais.brutoAposAuxilioTotal)}</td>
    <td>${resultado.curvelo.dados.totalPassagens + resultado.setelagoas.dados.totalPassagens}</td>
    <td>${resultado.curvelo.dados.alunosIntegrais + resultado.setelagoas.dados.alunosIntegrais}</td>
    <td>${resultado.curvelo.dados.alunosDesconto + resultado.setelagoas.dados.alunosDesconto}</td>
    <td>—</td>
  `;
  tfoot.appendChild(trFoot);

  renderizarCardsResumo(resultado);
}

function renderizarCardsResumo(resultado) {
  const container = document.getElementById('summaryCards');
  container.innerHTML = `
    <div class="summary-card">
      <div class="label">Bruto Total</div>
      <div class="value">${formatarMoeda(resultado.totais.brutoTotal)}</div>
    </div>
    <div class="summary-card">
      <div class="label">Auxílio Total Aplicado</div>
      <div class="value warning">${formatarMoeda(resultado.totais.auxilioTotalAplicado)}</div>
    </div>
    <div class="summary-card">
      <div class="label">Bruto Após Auxílio</div>
      <div class="value">${formatarMoeda(resultado.totais.brutoAposAuxilioTotal)}</div>
    </div>
    <div class="summary-card">
      <div class="label">% Curvelo no Bruto</div>
      <div class="value neutral">${resultado.curvelo.percentual.toFixed(2)}%</div>
    </div>
    <div class="summary-card">
      <div class="label">% Sete Lagoas no Bruto</div>
      <div class="value neutral">${resultado.setelagoas.percentual.toFixed(2)}%</div>
    </div>
  `;
}

// ============================================================
// DASHBOARD (CHART.JS)
// ============================================================
function renderizarDashboard(resultado) {
  const ctxBar = document.getElementById('barChart').getContext('2d');
  const ctxPie = document.getElementById('pieChart').getContext('2d');

  if (barChartInstance) barChartInstance.destroy();
  if (pieChartInstance) pieChartInstance.destroy();

  barChartInstance = new Chart(ctxBar, {
    type: 'bar',
    data: {
      labels: ['Curvelo', 'Sete Lagoas'],
      datasets: [
        {
          label: 'Bruto',
          data: [resultado.curvelo.calc.bruto, resultado.setelagoas.calc.bruto],
          backgroundColor: '#4d7fff',
          borderRadius: 6
        },
        {
          label: 'Bruto Após Auxílio',
          data: [resultado.curvelo.brutoAposAuxilio, resultado.setelagoas.brutoAposAuxilio],
          backgroundColor: '#2fd48f',
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: '#e8ecf5' } },
        title: {
          display: true,
          text: 'Bruto por Rota: Antes vs. Depois do Auxílio',
          color: '#e8ecf5',
          font: { size: 14 }
        }
      },
      scales: {
        x: { ticks: { color: '#9aa5bd' }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { ticks: { color: '#9aa5bd' }, grid: { color: 'rgba(255,255,255,0.05)' } }
      }
    }
  });

  pieChartInstance = new Chart(ctxPie, {
    type: 'pie',
    data: {
      labels: ['Curvelo', 'Sete Lagoas'],
      datasets: [{
        label: 'Auxílio Aplicado',
        data: [resultado.curvelo.auxilioAplicado, resultado.setelagoas.auxilioAplicado],
        backgroundColor: ['#4d7fff', '#2fd48f'],
        borderColor: '#161d2e',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: '#e8ecf5' } },
        title: {
          display: true,
          text: 'Distribuição do Auxílio entre as Rotas',
          color: '#e8ecf5',
          font: { size: 14 }
        }
      }
    }
  });
}

// ============================================================
// GERAÇÃO DE PDF
// ============================================================
function gerarPDF() {
  if (!ultimoResultado) {
    alert('Calcule o fechamento antes de gerar o PDF.');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'mm', 'a4');
  const resultado = ultimoResultado;

  const tipoAuxilioTexto = {
    proporcional: 'Auxílio em Dinheiro Proporcional',
    combustivel: 'Auxílio em Combustível',
    fixo: 'Auxílio Fixo por Rota'
  }[resultado.tipoAuxilio];

  // Cabeçalho
  doc.setFillColor(27, 36, 56);
  doc.rect(0, 0, 210, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text('Relatório de Fechamento de Rotas Escolares', 14, 14);
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text('Curvelo & Sete Lagoas', 14, 21);

  doc.setTextColor(0, 0, 0);
  let y = 40;

  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.text('Período de Fechamento:', 14, y);
  doc.setFont(undefined, 'normal');
  doc.text(resultado.periodo, 75, y);
  y += 7;

  doc.setFont(undefined, 'bold');
  doc.text('Tipo de Auxílio:', 14, y);
  doc.setFont(undefined, 'normal');
  doc.text(tipoAuxilioTexto, 75, y);
  y += 12;

  // Tabela principal
  doc.autoTable({
    startY: y,
    head: [['Rota', 'Bruto', 'Auxílio Aplicado', 'Bruto Após Auxílio', 'Passagens', 'Alunos Integrais', 'Alunos c/ Desconto', 'Custo Médio/Unidade']],
    body: [
      [
        resultado.curvelo.nome,
        formatarMoeda(resultado.curvelo.calc.bruto),
        formatarMoeda(resultado.curvelo.auxilioAplicado),
        formatarMoeda(resultado.curvelo.brutoAposAuxilio),
        resultado.curvelo.dados.totalPassagens,
        resultado.curvelo.dados.alunosIntegrais,
        resultado.curvelo.dados.alunosDesconto,
        formatarMoeda(resultado.curvelo.custoMedio)
      ],
      [
        resultado.setelagoas.nome,
        formatarMoeda(resultado.setelagoas.calc.bruto),
        formatarMoeda(resultado.setelagoas.auxilioAplicado),
        formatarMoeda(resultado.setelagoas.brutoAposAuxilio),
        resultado.setelagoas.dados.totalPassagens,
        resultado.setelagoas.dados.alunosIntegrais,
        resultado.setelagoas.dados.alunosDesconto,
        formatarMoeda(resultado.setelagoas.custoMedio)
      ]
    ],
    theme: 'grid',
    headStyles: { fillColor: [27, 36, 56], textColor: 255, fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 3 },
    margin: { left: 14, right: 14 }
  });

  y = doc.lastAutoTable.finalY + 12;

  // Totais gerais
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('Totais Gerais', 14, y);
  y += 8;

  doc.autoTable({
    startY: y,
    head: [['Indicador', 'Valor']],
    body: [
      ['Total Bruto das Duas Rotas', formatarMoeda(resultado.totais.brutoTotal)],
      ['Total de Auxílio Aplicado', formatarMoeda(resultado.totais.auxilioTotalAplicado)],
      ['Total Bruto Após Auxílio', formatarMoeda(resultado.totais.brutoAposAuxilioTotal)],
      ['% Participação Curvelo no Bruto', resultado.curvelo.percentual.toFixed(2) + '%'],
      ['% Participação Sete Lagoas no Bruto', resultado.setelagoas.percentual.toFixed(2) + '%']
    ],
    theme: 'striped',
    headStyles: { fillColor: [77, 127, 255], fontSize: 9 },
    styles: { fontSize: 9, cellPadding: 3 },
    margin: { left: 14, right: 14 }
  });

  y = doc.lastAutoTable.finalY + 12;

  // Detalhamento por rota
  [resultado.curvelo, resultado.setelagoas].forEach(rota => {
    if (y > 240) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text(`Detalhamento — ${rota.nome}`, 14, y);
    y += 7;

    doc.autoTable({
      startY: y,
      head: [['Item', 'Valor']],
      body: [
        ['Receita Alunos Integrais', formatarMoeda(rota.calc.receitaIntegrais)],
        ['Receita Alunos com Desconto', formatarMoeda(rota.calc.receitaDesconto)],
        ['Total Descontos Aplicados', formatarMoeda(rota.calc.totalDescontosAplicados)],
        ['Total Diárias de Veículos', formatarMoeda(rota.calc.totalDiarias)],
        ['Bruto da Rota', formatarMoeda(rota.calc.bruto)],
        ['Auxílio Aplicado', formatarMoeda(rota.auxilioAplicado)],
        ['Bruto Após Auxílio', formatarMoeda(rota.brutoAposAuxilio)],
        ['Custo Médio por Unidade', formatarMoeda(rota.custoMedio)]
      ],
      theme: 'grid',
      headStyles: { fillColor: [42, 53, 80], fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 2.5 },
      margin: { left: 14, right: 14 }
    });

    y = doc.lastAutoTable.finalY + 10;
  });

  // Rodapé
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`Página ${i} de ${pageCount} — Gerado em ${new Date().toLocaleDateString('pt-BR')}`, 14, 290);
  }

  doc.save(`Fechamento_Rotas_${resultado.periodo.replace(/[:\s]/g, '_')}.pdf`);
}

// ============================================================
// INICIALIZAÇÃO
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  renderizarVeiculos('curvelo');
  renderizarVeiculos('setelagoas');
});
