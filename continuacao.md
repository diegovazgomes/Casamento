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
- Ao abrir o dashboard no celular, na tela principal após fazer login, ela fica com uma especie de pequeno zoom, sendo necessário dar zoom out para ver melhor a tela, corrija isso.
- Nas respostas recebidas na aba de confirmações, pode remover o telefone, o icone de enviar lembrete, mantendo apenas convidado - grupo - status - data, nessa ordem
- A aba de mensagens precisa de ajuste de layout da página. precisa ser uma especie de mural de mensagens, nível premium, mantendo o padrão de design de todo o resto. Deverá ser uma especie de mural de mensagens, tendo o nome de quem mandou e a data de forma discreta, mantendo o destaque maior para a mensagem em si (A origem deverá ser removida)

### Observação
- O erro no teste de integração do dashboard foi de ambiente local (conexão recusada no banco local), não de sintaxe da implementação nova.
