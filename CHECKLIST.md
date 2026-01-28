# OrganizaDin - Checklist de Desenvolvimento

## Legenda
- ✅ Concluído
- 🔄 Em andamento
- ⏳ Pendente

---

## Fase 1: Estrutura Base
| # | Tarefa | Status | Arquivo/Pasta |
|---|--------|--------|---------------|
| 1.1 | Criar projeto Expo SDK 55 | ✅ | `package.json` |
| 1.2 | Configurar TypeScript | ✅ | `tsconfig.json` |
| 1.3 | Estrutura de pastas | ✅ | `src/` |
| 1.4 | Configurar tema (cores) | ✅ | `src/constants/theme.ts` |
| 1.5 | Definir tipos TypeScript | ✅ | `src/types/index.ts` |
| 1.6 | Instalar dependências | ✅ | `npm install` |
| 1.7 | Testar app no Expo Go | ✅ | `npx expo start` |

---

## Fase 2: Banco de Dados
| # | Tarefa | Status | Arquivo/Pasta |
|---|--------|--------|---------------|
| 2.1 | Esquema das tabelas SQLite | ✅ | `src/database/schema.ts` |
| 2.2 | Funções de acesso ao banco | ✅ | `src/database/database.ts` |
| 2.3 | Contexto do banco | ✅ | `src/contexts/DatabaseContext.tsx` |
| 2.4 | Categorias padrão | ✅ | Inseridas no schema |
| 2.5 | Testar persistência de dados | ⏳ | - |

---

## Fase 3: Navegação
| # | Tarefa | Status | Arquivo/Pasta |
|---|--------|--------|---------------|
| 3.1 | Layout principal | ✅ | `app/_layout.tsx` |
| 3.2 | Navegação por tabs | ✅ | `app/(tabs)/_layout.tsx` |
| 3.3 | Botão central flutuante | ✅ | `app/(tabs)/_layout.tsx` |
| 3.4 | Contexto de tema | ✅ | `src/contexts/ThemeContext.tsx` |

---

## Fase 4: Tela Início (Dashboard)
| # | Tarefa | Status | Arquivo/Pasta |
|---|--------|--------|---------------|
| 4.1 | Layout base da tela | ✅ | `app/(tabs)/index.tsx` |
| 4.2 | Card saldo disponível | ✅ | `app/(tabs)/index.tsx` |
| 4.3 | Card total cartão (mês) | ✅ | `app/(tabs)/index.tsx` |
| 4.4 | Card previsão próximo mês | ✅ | `app/(tabs)/index.tsx` |
| 4.5 | Ações rápidas | ✅ | `app/(tabs)/index.tsx` |
| 4.6 | Últimas movimentações | ⏳ | `app/(tabs)/index.tsx` |
| 4.7 | Pull to refresh | ✅ | `app/(tabs)/index.tsx` |

---

## Fase 5: Movimentações de Saldo (Dinheiro Real)
| # | Tarefa | Status | Arquivo/Pasta |
|---|--------|--------|---------------|
| 5.1 | Tela adicionar entrada/saída | ✅ | `app/add-balance.tsx` |
| 5.2 | Formulário (valor, descrição, data) | ✅ | `app/add-balance.tsx` |
| 5.3 | Seleção de tipo (Entrada/Saída) | ✅ | `app/add-balance.tsx` |
| 5.4 | Seleção de meio (Pix/Débito/Dinheiro) | ✅ | `app/add-balance.tsx` |
| 5.5 | Salvar no banco | ✅ | `app/add-balance.tsx` |
| 5.6 | Atualizar saldo na tela Início | ✅ | `app/(tabs)/index.tsx` |

---

## Fase 6: Compras no Cartão de Crédito
| # | Tarefa | Status | Arquivo/Pasta |
|---|--------|--------|---------------|
| 6.1 | Modal de nova compra | ✅ | `app/add-purchase.tsx` |
| 6.2 | Campo valor total | ✅ | `app/add-purchase.tsx` |
| 6.3 | Campo descrição | ✅ | `app/add-purchase.tsx` |
| 6.4 | Seleção de data | ✅ | `app/add-purchase.tsx` |
| 6.5 | Seleção de cartão | ✅ | `app/add-purchase.tsx` |
| 6.6 | Adicionar novo cartão inline | ✅ | `app/add-purchase.tsx` |
| 6.7 | Seleção de categoria | ✅ | `app/add-purchase.tsx` |
| 6.8 | Seleção de parcelas | ✅ | `app/add-purchase.tsx` |
| 6.9 | Toggle recorrente | ✅ | `app/add-purchase.tsx` |
| 6.10 | Anexar imagem/foto | ✅ | `app/add-purchase.tsx` |
| 6.11 | Gerar parcelas automáticas | ✅ | `app/add-purchase.tsx` |
| 6.12 | Compra com múltiplos itens | ✅ | `app/add-purchase.tsx` |
| 6.13 | Editar compra existente | ✅ | `app/edit-purchase.tsx` |
| 6.14 | Excluir compra | ✅ | `app/edit-purchase.tsx` |

---

## Fase 7: Tela Histórico
| # | Tarefa | Status | Arquivo/Pasta |
|---|--------|--------|---------------|
| 7.1 | Layout base | ✅ | `app/(tabs)/history.tsx` |
| 7.2 | Agrupamento por mês | ✅ | `app/(tabs)/history.tsx` |
| 7.3 | Blocos expansíveis | ✅ | `app/(tabs)/history.tsx` |
| 7.4 | Busca por texto | ✅ | `app/(tabs)/history.tsx` |
| 7.5 | Filtros (mês, categoria, cartão) | ✅ | `app/(tabs)/history.tsx` |
| 7.6 | Indicador de imagem | ✅ | `app/(tabs)/history.tsx` |
| 7.7 | Abrir detalhes ao tocar | ✅ | `app/(tabs)/history.tsx` |
| 7.8 | Editar/apagar item | ✅ | `app/edit-balance.tsx` |

---

## Fase 8: Tela Parcelas
| # | Tarefa | Status | Arquivo/Pasta |
|---|--------|--------|---------------|
| 8.1 | Layout base | ✅ | `app/(tabs)/installments.tsx` |
| 8.2 | Lista de compras parceladas | ✅ | `app/(tabs)/installments.tsx` |
| 8.3 | Informações por item | ✅ | `app/(tabs)/installments.tsx` |
| 8.4 | Cores por status (🔴🟠🟢) | ✅ | `app/(tabs)/installments.tsx` |
| 8.5 | Redução futura da fatura | ✅ | `app/(tabs)/installments.tsx` |

---

## Fase 9: Sistema de Pagamentos
| # | Tarefa | Status | Arquivo/Pasta |
|---|--------|--------|---------------|
| 9.1 | Marcar parcela como paga | ✅ | `app/(tabs)/installments.tsx` |
| 9.2 | Marcar todas do mês como pagas | ✅ | `app/(tabs)/installments.tsx` |
| 9.3 | Marcar todas do cartão como pagas | ✅ | `app/(tabs)/installments.tsx` |
| 9.4 | Deduzir do saldo ao pagar | ✅ | `app/(tabs)/installments.tsx` |

---

## Fase 10: Porquinhos (Dinheiro Guardado)
| # | Tarefa | Status | Arquivo/Pasta |
|---|--------|--------|---------------|
| 10.1 | Tela com proteção por senha | ✅ | `app/piggy.tsx` |
| 10.2 | Criar/definir senha 4 dígitos | ✅ | `app/piggy.tsx` |
| 10.3 | Desbloquear com senha | ✅ | `app/piggy.tsx` |
| 10.4 | Criar novo porquinho | ✅ | `app/piggy.tsx` |
| 10.5 | Guardar dinheiro | ✅ | `app/piggy.tsx` |
| 10.6 | Retirar dinheiro | ✅ | `app/piggy.tsx` |
| 10.7 | Total geral dos porcos | ✅ | `app/piggy.tsx` |
| 10.8 | Transferir entre porcos | ⏳ | `app/piggy.tsx` |
| 10.9 | Transferir do saldo para porco | ⏳ | `app/piggy.tsx` |
| 10.10 | Histórico do porquinho | ⏳ | `app/piggy.tsx` |
| 10.11 | Editar/excluir porquinho | ⏳ | `app/piggy.tsx` |

---

## Fase 11: Configurações
| # | Tarefa | Status | Arquivo/Pasta |
|---|--------|--------|---------------|
| 11.1 | Layout base | ✅ | `app/(tabs)/settings.tsx` |
| 11.2 | Alternar tema claro/escuro | ✅ | `app/(tabs)/settings.tsx` |
| 11.3 | Definir renda mensal fixa | ✅ | `app/(tabs)/settings.tsx` |
| 11.4 | Gerenciar categorias | ⏳ | `app/manage-categories.tsx` |
| 11.5 | Gerenciar cartões | ⏳ | `app/manage-cards.tsx` |
| 11.6 | Acesso aos Porquinhos | ✅ | `app/(tabs)/settings.tsx` |

---

## Fase 12: Relatórios e Análises
| # | Tarefa | Status | Arquivo/Pasta |
|---|--------|--------|---------------|
| 12.1 | Tela de relatórios | ⏳ | `app/reports.tsx` |
| 12.2 | Gastos por mês | ⏳ | - |
| 12.3 | Gastos por categoria | ⏳ | - |
| 12.4 | Gastos por cartão | ⏳ | - |
| 12.5 | Entrada vs Saída | ⏳ | - |
| 12.6 | Mês que mais gastou | ⏳ | - |
| 12.7 | Evolução financeira | ⏳ | - |
| 12.8 | Resumão próximos meses | ⏳ | `app/future-summary.tsx` |

---

## Fase 13: Backup e Restauração
| # | Tarefa | Status | Arquivo/Pasta |
|---|--------|--------|---------------|
| 13.1 | Exportar dados (backup) | ⏳ | - |
| 13.2 | Importar dados (restaurar) | ⏳ | - |

---

## Fase 14: Polimento Final
| # | Tarefa | Status | Arquivo/Pasta |
|---|--------|--------|---------------|
| 14.1 | Criar ícone do app | ⏳ | `src/assets/images/icon.png` |
| 14.2 | Criar splash screen | ⏳ | `src/assets/images/splash.png` |
| 14.3 | Adaptive icon (Android) | ⏳ | `src/assets/images/adaptive-icon.png` |
| 14.4 | Testar em dispositivo real | ⏳ | - |
| 14.5 | Corrigir bugs encontrados | ⏳ | - |
| 14.6 | Build de produção | ⏳ | `eas build` |

---

## Resumo de Progresso

| Fase | Concluído | Total | % |
|------|-----------|-------|---|
| 1. Estrutura Base | 7 | 7 | 100% |
| 2. Banco de Dados | 4 | 5 | 80% |
| 3. Navegação | 4 | 4 | 100% |
| 4. Tela Início | 6 | 7 | 86% |
| 5. Movimentações Saldo | 6 | 6 | 100% |
| 6. Compras Cartão | 14 | 14 | 100% |
| 7. Tela Histórico | 8 | 8 | 100% |
| 8. Tela Parcelas | 5 | 5 | 100% |
| 9. Sistema Pagamentos | 4 | 4 | 100% |
| 10. Porquinhos | 7 | 11 | 64% |
| 11. Configurações | 4 | 6 | 67% |
| 12. Relatórios | 0 | 8 | 0% |
| 13. Backup | 0 | 2 | 0% |
| 14. Polimento | 0 | 6 | 0% |

**Total Geral: 67/93 tarefas (72%)**

---

## Próximas Etapas (Ordem Recomendada)

1. ✅ **Instalar dependências** → `npm install`
2. ✅ **Testar no Expo Go** → `npx expo start`
3. ✅ **Tela Entrada/Saída de Saldo** (Fase 5)
4. ✅ **Sistema de Pagamentos** (Fase 9)
5. ✅ **Filtros no Histórico** (Fase 7.5)
6. ✅ **Compra com múltiplos itens** (Fase 6.12)
7. ✅ **Editar/excluir compra** (Fase 6.13-6.14)
8. ✅ **Detalhes/editar histórico** (Fase 7.7-7.8)
9. ⏳ **Gerenciar Categorias/Cartões** (Fase 11.4-11.5) ← PRÓXIMO
10. ⏳ **Relatórios** (Fase 12)
11. ⏳ **Ícones e Splash** (Fase 14)
