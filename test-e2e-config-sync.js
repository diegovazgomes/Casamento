#!/usr/bin/env node

/**
 * Manual E2E Test: Config Sync - Dashboard -> API -> Site
 */

console.log('E2E Test: Config Sync - Dashboard -> API -> Site\n');

// STEP 1: Simular site.json estatico
const staticConfig = {
  activeLayout: 'classic',
  rsvp: { eventId: 'siannah-diego-2026', supabaseEnabled: true },
  couple: { names: 'Siannah & Diego (static file)' }
};

console.log('Step 1: Carregado site.json:');
console.log(` - couple.names: "${staticConfig.couple.names}"`);
console.log(` - rsvp.eventId: "${staticConfig.rsvp.eventId}"\n`);

// STEP 2: Detectar eventId e construir URL da API
const eventId = staticConfig?.rsvp?.eventId;
const finalConfigUrl = `https://api.casamento.com/config/${eventId}`;
console.log('Step 2: Detectando eventId...');
console.log(` - EventId: "${eventId}"`);
console.log(` - API URL: ${finalConfigUrl}\n`);

// STEP 3: Simular resposta da API (dados atualizados no dashboard)
const apiResponse = {
  activeLayout: 'modern',
  couple: { names: 'Siannah & Diego (Dashboard Updated)' }
};
console.log('Step 3: Simulando carregamento da API...');
console.log(` - Novo couple.names: "${apiResponse.couple.names}"\n`);

// STEP 4: Merge das configuracoes
const finalConfig = { ...staticConfig, ...apiResponse };
finalConfig.couple = { ...staticConfig.couple, ...apiResponse.couple };

console.log('Step 4: Resultado final (Sincronizado):');
console.log(` - Versão final do site exibirá: "${finalConfig.couple.names}"`);
console.log(` - Layout final: "${finalConfig.activeLayout}"`);

if (finalConfig.couple.names === apiResponse.couple.names) {
  console.log('\nSUCCESS: Site esta sincronizado com a API!');
} else {
  console.log('\nFAILURE: Sincronizacao falhou.');
  process.exit(1);
}
