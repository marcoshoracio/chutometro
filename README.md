# Chutômetro 🏆

Bolão da Copa do Mundo 2026 — jogo de previsões para grupos privados.

## Requisitos

- Node.js 18+
- npm 8+

## Instalação

```bash
npm install
```

## Desenvolvimento

```bash
npm run dev
```

Isso inicia:
- API em http://localhost:3001
- Frontend em http://localhost:5173

## Configuração

Copie `packages/api/.env.example` para `packages/api/.env` e preencha as variáveis.

Em modo dev, se não houver SMTP configurado, o magic link é exibido no console.

## Estrutura

```
chutometro/
  packages/
    api/    — Node.js + Express + SQLite
    web/    — React + Vite + TailwindCSS
```

## Pontuação

| Resultado | Pontos Base |
|-----------|-------------|
| Placar exato | 10 |
| Vencedor certo + saldo de gols certo | 6 |
| Vencedor certo OU empate certo (placar errado) | 3 |
| Resultado errado | 0 |

**Bônus:**
- Ambos os totais individuais certos (ordem invertida conta): +2
- Total de gols certo: +1
- Sequência de 3 acertos consecutivos: +1

**Multiplicadores por fase:**
- Fase de grupos: ×1
- Oitavas: ×1,5
- Quartas: ×2 (não, espera — ver scoring.js para valores corretos)
