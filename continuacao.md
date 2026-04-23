## Atualização rápida — abas de Mensagens e Músicas

### Ponto atual
- Implementadas 2 novas abas no dashboard: **Mensagens** e **Músicas**.
- Sidebar e topbar já reconhecem as novas abas.
- Cada aba já tem:
  - campo de busca com debounce;
  - tabela de listagem;
  - estado de loading;
  - estado vazio;
  - paginação.
- Criado endpoint novo: `GET /api/dashboard/submissions`.
- O endpoint já:
  - valida autenticação do dashboard (Bearer token);
  - lê do Supabase (`guest_submissions`);
  - filtra por `eventId` e `type` (`message`/`song`);
  - aplica busca textual;
  - retorna paginação.

### Próximos passos (resumido)
1. Testar manualmente as duas abas com dados reais do Supabase (produção/homologação).
2. Ajustar detalhes de UX, se necessário (largura de colunas, truncamento de texto, labels).
3. Adicionar testes automáticos para o novo endpoint `submissions`.
4. Adicionar testes de integração do dashboard cobrindo troca de abas + render + paginação.
5. Validar deploy (Vercel) e fazer smoke final de regressão nas abas existentes.

### Observação
- O erro no teste de integração do dashboard foi de ambiente local (conexão recusada no banco local), não de sintaxe da implementação nova.
