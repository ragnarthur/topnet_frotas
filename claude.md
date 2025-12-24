# CLAUDE.md — FleetFuel (Controle de Frota + Combustível) para Provedor (Rural/Urbano)

Você é o(a) engenheiro(a) de software sênior responsável por me ajudar a construir este MVP **com qualidade de produto**.
O objetivo é reduzir o gasto mensal de combustível (hoje alto e pouco controlado) com **rastreabilidade, consistência e alertas**.

> Regra de ouro: **nada de “achismo” nos números**. Custos vêm de lançamentos reais (abastecimentos/importações),
e o “preço do combustível” deve ser **sempre atualizado automaticamente** com base no histórico (e opcionalmente por fonte externa).

---

## 1) Contexto do Projeto (o que o cliente enxerga)
O cliente é um provedor de internet rural/urbano com 4 veículos:

- Troller (uso rural pesado)
- Corsa Wind (urbano leve)
- Montana (misto: instalação + carga)
- Captiva (uso pessoal do dono/gestor — deve aparecer separado)

Problema atual:
- Gasto mensal elevado e difícil de auditar.
- Sem controle por veículo, motorista, centro de custo e odômetro.
- Erros de lançamento e inconsistências passam batido.

Resultado esperado no MVP:
- Dashboard com custo mensal por veículo + custo/km + consumo (km/L).
- Cadastro/importação de abastecimentos com anexos.
- Regras automáticas de consistência (alertas).
- Preço do combustível “sempre atualizado” como referência (auto-fill e baseline).

---

## 2) Stack e Arquitetura
### Backend (Python)
- Django + Django REST Framework
- PostgreSQL
- Autenticação JWT
- Celery (tarefas/rotinas) + Celery Beat (agendamentos) OU cron via management command

### Serviço Node.js (realtime/alert engine)
- Fastify (simples) ou NestJS (mais estrutura)
- WebSocket/SSE para atualizar dashboard e alertas em tempo real
- Integração com Redis Pub/Sub (eventos do backend)

### Frontend
- Vite + React + TypeScript
- TanStack Query (React Query)
- TanStack Table
- React Hook Form + Zod
- UI: shadcn/ui

---

## 3) Fonte da Verdade (dados reais) — sem “mágica”
### 3.1 Abastecimentos são o **registro real** do custo
Cada abastecimento deve ter:
- veículo
- motorista (opcional no começo, mas recomendado)
- data/hora
- litros (Decimal)
- preço por litro (Decimal)
- valor total (Decimal)  ← calculado e persistido (ou validado)
- odômetro (km)
- posto (opcional)
- centro de custo (rural/urbano/instalação/manutenção/etc.)
- anexo (foto/nota)

**Números de dashboard** vêm da soma de abastecimentos reais no período.
Nada de estimar custo mensal “na raça”.

### 3.2 Preço do combustível “sempre atualizado”
O sistema mantém uma tabela de referência com preço atual (por tipo de combustível e opcionalmente por posto):

- `FuelPriceSnapshot`:
  - fuel_type (GASOLINE | ETHANOL | DIESEL)
  - station (nullable)
  - price_per_liter (Decimal)
  - collected_at (datetime)
  - source ("last_transaction" | "manual" | "external_anp" | etc.)

**Como atualizar automaticamente (MVP)**
1) Sempre que salvar um `FuelTransaction`, atualizar `FuelPriceSnapshot` do mesmo combustível:
   - price_per_liter = transaction.unit_price
   - source = "last_transaction"
   - collected_at = transaction.purchased_at
2) No formulário de novo abastecimento, sugerir (auto-fill) o último preço conhecido:
   - Por posto+combustível (se posto informado)
   - Senão por combustível global

**Opcional (fase 2)**
- Rotina diária/semanal busca preço médio externo (ex.: fonte pública) e registra snapshot com source="external_*".
- Se falhar, mantém o último snapshot local (não quebra o produto).

---

## 4) Regras de Negócio essenciais (MVP que vende)
### 4.1 Consistência / Alertas (não bloqueia, mas sinaliza)
Gerar alertas quando:
- Odômetro regrediu (novo odômetro < último odômetro do veículo)
- Litros excedem capacidade do tanque (se `Vehicle.tank_capacity_liters` configurado)
- Consumo anômalo:
  - km/l muito baixo ou muito alto para o veículo (faixa configurável)
- Abastecimento “pessoal” marcado como operacional (para Captiva/uso pessoal)

Modelo sugerido:
- `Alert`:
  - vehicle
  - fuel_transaction (nullable)
  - type (ODOMETER_REGRESSION | LITERS_OVER_TANK | OUTLIER_CONSUMPTION | PERSONAL_USAGE)
  - severity (INFO | WARN | CRITICAL)
  - message
  - created_at
  - resolved_at (nullable)

### 4.2 Separar uso pessoal vs operacional (Captiva)
- `Vehicle.usage_category`:
  - OPERATIONAL | PERSONAL
Dashboard deve ter toggle/filtragem:
- “Incluir uso pessoal” (default: OFF)

---

## 5) Modelos (mínimo recomendado)
Crie estes modelos no Django:

- Vehicle(plate, name, model, fuel_type, tank_capacity_liters, usage_category, active)
- Driver(name, doc_id?, active)
- CostCenter(name, category: RURAL|URBAN|INSTALLATION|MAINTENANCE|ADMIN)
- FuelStation(name, city, active)
- FuelTransaction(vehicle, driver?, station?, cost_center?, purchased_at, liters, unit_price, total_cost, odometer_km, notes)
- FuelPriceSnapshot(fuel_type, station?, price_per_liter, collected_at, source)
- Attachment(entity_type, entity_id, file_url, uploaded_at) (ou FK direto em FuelTransaction)
- Alert(...)

Use `Decimal` para valores e litros. Nada de float.

---

## 6) Endpoints (DRF) — contrato mínimo do front
- POST /api/auth/login/
- GET  /api/dashboard/summary?from=YYYY-MM-DD&to=YYYY-MM-DD&include_personal=0|1
- GET  /api/vehicles/
- GET  /api/vehicles/:id/
- GET  /api/fuel-transactions/?from=&to=&vehicle_id=&driver_id=&cost_center_id=
- POST /api/fuel-transactions/
- GET  /api/fuel-prices/latest?fuel_type=&station_id=
- GET  /api/alerts/?from=&to=&vehicle_id=
- POST /api/import/fuel-transactions (CSV)  ← opcional mas muito forte pra demo real

Dashboard deve retornar:
- total_cost_period
- cost_by_vehicle[]
- liters_by_vehicle[]
- avg_km_per_liter_by_vehicle[]
- cost_per_km_by_vehicle[]
- alerts_open_count
- top_alerts[]

---

## 7) Frontend (Vite) — páginas obrigatórias
- /login
- /dashboard
- /abastecimentos (list + criar)
- /veiculos (list + detalhe)
- /relatorios (export CSV)

UX objetivo:
- tabela com filtros persistentes
- formulário com auto-fill do preço do combustível (snapshot)
- upload simples de comprovante
- alertas visíveis no dashboard

---

## 8) Atualização “sempre” (o comportamento que não pode falhar)
Implementar pipeline reativo:

### 8.1 Evento de abastecimento (backend)
Após criar/atualizar um FuelTransaction:
1) recalcular snapshot de preço do combustível (FuelPriceSnapshot)
2) gerar alertas de consistência (Alert)
3) publicar evento em Redis:
   - channel: fleetfuel.events
   - payload: { type: "FUEL_TRANSACTION_CREATED", vehicle_id, purchased_at }

### 8.2 Node realtime
- Assina Redis
- Emite via WebSocket/SSE:
  - dashboard_updated
  - alerts_updated

### 8.3 Frontend
- TanStack Query revalida ao receber evento
- Sem websockets? fallback:
  - revalidate a cada 30–60s no dashboard (só no MVP)

---

## 9) Estilo de Implementação (como você deve responder)
Ao me ajudar:

1) Sempre proponha o caminho mais simples que entrega valor no MVP.
2) Sempre forneça **código completo** dos arquivos alterados (sem “trechos soltos” quando eu pedir pra copiar/colar).
3) Inclua:
   - caminhos dos arquivos
   - migrations
   - serializers/views/urls
   - validações e mensagens de erro claras
4) Sempre usar Decimal e validações de consistência.
5) Nunca inventar endpoints/nomes se o repositório já tiver padrão — pergunte pelo arquivo ou peça que eu cole o conteúdo.
6) Priorizar testes onde faz sentido:
   - validação de odômetro
   - cálculo total_cost
   - geração de alertas
   - endpoint dashboard summary

Formato de saída quando eu pedir feature:
- ✅ Plano rápido (3–6 bullets)
- ✅ Patch com arquivos completos
- ✅ Checklist de validação manual

---

## 10) Seed e “dados reais”
### 10.1 Dados reais
Quando eu disser “usar dados reais”, considerar:
- O valor do combustível e gasto por carro vêm de **lançamentos/importação**.
- “Preço atualizado” é referência baseada no **último abastecimento** (ou fonte externa se houver).

### 10.2 Importação (recomendado para vida real)
Se eu fornecer CSV/Excel:
- criar importer robusto:
  - parse Decimal
  - valida data/placa/odômetro
  - dedup por (vehicle, purchased_at, liters, total_cost)
  - log de erros por linha

---

## 11) Convenções de Código
- Python:
  - black, isort, ruff
  - typing onde ajudar
- Node:
  - TypeScript obrigatório
- React:
  - componentes funcionais
  - zod para schemas
  - sem state global prematuro (prefira query cache)

---

## 12) Definição de pronto (MVP)
Considerar “pronto” quando:
- consigo cadastrar abastecimento e ele:
  - atualiza preço de referência
  - aparece no dashboard
  - dispara alertas se inconsistente
- dashboard mostra custo por veículo e total do período
- consigo filtrar por veículo e exportar CSV
- captiva (pessoal) pode ser excluída dos relatórios por padrão

---

## 13) Nota final (pragmatismo)
Esse MVP deve “parecer produto”.
Pode ser simples, mas tem que ser consistente, rápido e bonito.
O cliente perdoa falta de mapa ao vivo no protótipo.
Ele **não perdoa** número que não fecha e tela que parece planilha de 2009.

Vamos construir direito.
