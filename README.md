📱 OrganizaDin — Documento de Especificação do App


1. Visão Geral
Nome: OrganizaDin
Objetivo: App de controle financeiro pessoal para organizar:
- 💰 Dinheiro real (saldo via Pix, débito, dinheiro)
- 💳 Gastos no cartão de crédito (à vista e parcelados)
- ⏳ Parcelas futuras
- 📜 Histórico completo
- 📊 Relatórios e análises
- 🐷 Área de dinheiro guardado protegida por senha

2. Conceito Principal
Separação clara entre:
- 💰 Saldo disponível → dinheiro real que você pode usar
- 💳 Cartão de crédito → não mexe no saldo, entra na fatura / parcelas
> Observação: o saldo disponível é único; o dinheiro no Porco não entra nele.

3. Estrutura de Telas (Menu Inferior)
1. 🏠 Início
2. 📜 Histórico
3. ➕ Botão central (Adicionar compra no cartão)
4. 🧾 Parcelas
5. ⚙️ Configurações

4. Tela Início
Mostra:
- 💰 Saldo disponível
- 💳 Total a pagar no cartão (mês atual)
- 🔮 Previsão do próximo mês (quanto vai sobrar ou faltar)
- 🛒 Últimas movimentações
Ações:
- 💳 Botão central: adicionar compra no cartão
- Entradas e saídas de dinheiro real já aparecem na barra de saldo

5. Movimentações de Saldo (Dinheiro Real)
Campos:
- Valor
- Descrição
- Data
- Tipo: Entrada / Saída
- Meio: Pix / Débito / Dinheiro
Regras:
- Entradas aumentam o saldo
- Saídas diminuem o saldo
- Não tem parcelamento
- Pode transferir para Porcos

6. Compras no Cartão de Crédito
Campos:
- Valor total
- Data
- Descrição geral
- 📷 Imagem/foto opcional
- Cartão
- Categoria
- Forma: Compra única / Compra com vários itens
- Parcelamento: número de parcelas
- 🔁 Despesa recorrente opcional
Compra com vários itens:
- Cada item: nome + valor (+ imagem opcional)
- Soma dos itens = valor total
Edição:
- ✏️ Editar qualquer compra ou item
- 🗑️ Excluir
- Parcelada: ao editar valor, parcelas ou recorrência → recalcula automaticamente

7. Tela Parcelas
- Lista consolidada de todas as compras parceladas
- Cada item mostra:
 - Nome da compra
 - Cartão
 - Valor da parcela
 - Total de parcelas
 - Quantas faltam
 - Quanto já foi pago
 - Quanto falta pagar
 - Mês de término
Regras de cores:
- 🔴 3 ou mais parcelas faltando
- 🟠 2 parcelas faltando
- 🟢 1 parcela faltando
Navegação:
- ❗ Não abre detalhe individual
- Detalhe completo só pelo Histórico
Informativo:
- 📉 Mostra quanto a fatura vai diminuir nos próximos meses ao acabar parcelas

8. Tela Histórico
- Organizado por mês (Janeiro, Fevereiro…)
- Cada mês é um bloco expansível
- Itens mostram:
 - Data, Valor, Descrição, Tipo, Cartão, Categoria, Status
 - Indicador de imagem quando existir
Funcionalidades:
- 🔍 Filtros por mês, categoria, cartão, tipo de pagamento
- 🔎 Busca por texto
- Ao tocar:
 - Compra simples → abre detalhes
 - Compra parcelada → abre tela de Parcelas daquele item
- ✏️ Editar e 🗑️ apagar qualquer item

9. Sistema de Pagamentos (Cartão)
- Status: ⏳ Pendente / ✅ Paga
- Opções: marcar tudo do mês, tudo do cartão ou individualmente
- Ao marcar como pago: diminui do saldo disponível
- Total a pagar = soma das despesas pendentes

10. Área de Dinheiro Guardado 🔒 (Porco 🐷)
- Protegida por senha de 4 números
- Ícone: porquinho (corpo ou rosto)
- Múltiplos Porcos: cada um com nome e valor (ex: Viagem, Reforma, Curso)
Funções:
- ➕ Guardar dinheiro (do saldo disponível)
- ➕ Adicionar manualmente
- ➖ Retirar dinheiro
- 🔁 Transferir entre Porcos e Saldo
- Histórico próprio com data, valor, tipo e motivo da movimentação
- Sempre pedir Motivo/descrição
- 🧮 Total Geral dos Porcos mostrado no topo da tela
Regras:
- Dinheiro no Porco não entra no saldo disponível
- Não entra em gastos ou faturas
- Só muda com movimentação manual

11. Categorias e Cartões
- Categorias prontas: Alimentação, Casa, Transporte, Lazer, Saúde, Compras, Assinaturas, Outros
- Usuário pode criar, editar ou apagar
- Cartões: nome livre, pode editar e remover

12. Regras Importantes
- Apagar compra parcelada: apagar todas ou apenas esta parcela
- Ao editar valor/parcelas → recalcula automaticamente

13. Tela Configurações
- Alterar tema (claro/escuro)
- 💰 Definir Renda Mensal Fixa (entra todo mês no primeiro dia útil)
- Gerenciar categorias e cartões
- Backup / restauração
- Acesso à área de Porcos
- Relatórios e análises

14. Relatórios e Análises
- Gastos por mês, categoria, cartão
- Entrada vs saída
- Mês que mais gastou
- Evolução financeira
- Previsão do próximo mês: renda fixa, gastos comprometidos, quanto vai sobrar/faltar
Resumão dos Próximos Meses
- Lista dos próximos meses com impacto financeiro
- Para cada mês: mês/ano, total comprometido, renda, resultado final (vai sobrar/faltar)
- Cores: verde positivo, vermelho negativo

15. Tema Visual
- Tema principal: escuro com verde
- Opção de tema claro
- Estilo simples, moderno, minimalista
Regras de cores:
- 🟣 Recorrentes
- 🔴 Muitas parcelas
- 🟠 Penúltima parcela
- 🟢 Última parcela
- 🟢 Crédito 1x
- 🔵 Débito/Pix
- 💰 Saldo disponível <150 → vermelho, ≥150 → verde
- 🔮 Previsão próximo mês: sobra → verde, falta → vermelho

16. Ícone
- Estilo ultra minimalista
- Fundo verde
- Símbolo simples

17. Cálculos Importantes
- Saldo disponível = soma entradas − soma saídas + transferências do Porco
- Total a pagar = soma compras/parcelas pendentes
- Previsão próximo mês = renda mensal fixa − parcelas + recorrentes

18. Plataforma Inicial
- Android

19. Observações Finais
- Sem notificações por enquanto
- App funciona offline
- Backup opcional