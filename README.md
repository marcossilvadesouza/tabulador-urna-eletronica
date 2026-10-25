# Tabulador & Auditoria de Urna Eletrônica (TSE)

Aplicação web desenvolvida em **Next.js 15**, **React 19**, **TypeScript** e **Tailwind CSS** para visualização, apuração consolidada, análise forense de logs e auditoria independente dos arquivos públicos gerados pelas urnas eletrônicas da Justiça Eleitoral Brasileira (TSE).

---

## 🎯 Para que serve

- **Apuração Consolidada Multi-Seções:** Totaliza em tempo real votos nominais, votos de legenda, brancos e nulos de todas as seções importadas, exibindo percentuais, comparecimento e abstenção agregados.
- **Leitura do Boletim de Urna (BU):** Decodifica a estrutura binária oficial ASN.1/BER dos arquivos `.bu` e `.dat`, apresentando os votos por cargo e candidato, eleitores aptos e dados cadastrais da seção.
- **Análise Forense de Logs de Urna (`.jez`):** Descompacta os arquivos comprimidos da urna, extrai o log de eventos (`logd.dat`), classifica eventos por severidade (DEBUG, INFO, WARN, ERROR), calcula métricas e monta uma timeline cronológica das operações da urna.
- **Reconciliação e Auditoria Eleitoral:** Executa checagens automáticas de integridade e regras de negócio:
  - Balanço de eleitores: eleitores aptos = comparecimento + abstenção.
  - Fechamento aritmético de votos por cargo: nominais + legenda + brancos + nulos = comparecimento.
  - Cruzamento BU vs Log de Urna: conferência de número de série da urna UE, código de carga, horário de emissão da zerésima (antes das 08h), horário de encerramento da votação (a partir das 17h) e emissão do BU.
- **Inspetor ASN.1 em Árvore:** Permite navegar na árvore de tags BER/DER do arquivo da urna em baixo nível, visualizando identificadores, comprimentos e valores hexadecimais/textuais.

---

## 📦 Formatos de Arquivos Suportados

A ferramenta aceita upload direto via arrastar e soltar (drag & drop) ou seleção de arquivos:

| Tipo | Extensão | Descrição |
| :--- | :--- | :--- |
| **Pacote Completo** | `.zip` | Arquivo compactado baixado do TSE contendo BU, Log, RDV e VSC. O sistema descompacta e processa tudo automaticamente. |
| **Boletim de Urna** | `.dat` / `.bu` | Arquivo codificado em ASN.1 contendo a totalização dos votos da seção eleitoral. |
| **Log da Urna** | `.jez` | Arquivo comprimido que armazena os registros de eventos (`logd.dat`) gerados pelo sistema operacional da urna. |
| **Registro Digital do Voto** | `*-rdv.dat` | Registro individualizado e desidentificado dos votos computados. |
| **Votação Secionada** | `*-vota.vsc` | Arquivo auxiliar de votação da seção. |

---

## 🌐 Como Baixar os Arquivos de Urna no Portal do TSE

Qualquer cidadão pode baixar os arquivos de qualquer urna eletrônica de qualquer eleição diretamente dos portais da Justiça Eleitoral.

### Opção 1: Portal de Resultados do TSE (Boletim de Urna na Web)

1. Acesse o portal oficial: **[https://resultados.tse.jus.br](https://resultados.tse.jus.br)**
2. No menu principal, clique na opção **"Dados de Urna"** (ou **"Boletim de Urna na Web"** / **"Arquivos de Urna"**).
3. Selecione a **Eleição** desejada (exemplo: *Eleições Gerais 2022* ou *Eleições Municipais 2024*).
4. Selecione o **Turno** (1º Turno ou 2º Turno).
5. Filtre por:
   - **Estado (UF)**
   - **Município**
   - **Zona Eleitoral**
   - **Seção Eleitoral**
6. Localize a seção de download de arquivos da urna:
   - **Boletim de Urna:** Baixe o arquivo com extensão `.bu` ou `.dat`.
   - **Log da Urna:** Baixe o arquivo com extensão `.jez`.
   - **RDV:** Baixe o arquivo de Registro Digital do Voto (`.dat`).
   - *Dica:* Se houver o botão **"Baixar pacote da seção (.zip)"**, baixe o `.zip` diretamente.

### Opção 2: Portal de Dados Abertos do TSE

1. Acesse: **[https://dadosabertos.tse.jus.br](https://dadosabertos.tse.jus.br)**
2. Procure pelo conjunto de dados: **"Arquivos transmitidos para totalização"** correspondente ao ano da eleição.
3. Escolha o estado desejado e baixe os arquivos em lote por zona/município.

---

## 🚀 Como Utilizar o Tabulador

1. **Importação:**
   - Abra a aplicação no navegador.
   - Arraste o arquivo `.zip`, `.dat` ou `.jez` baixado do TSE para a área de upload no topo da tela (ou clique no botão **"Importar Arquivos"**).
   - O sistema detecta automaticamente o estado, município, zona eleitoral, seção e turno a partir dos metadados internos dos arquivos e salva organizadamente no diretório `storage/`.
2. **Navegação:**
   - **Apuração Consolidada:** Visão agregada somando todas as urnas cadastradas.
   - **Seletor de Seções:** Selecione o estado, zona e seção desejada no painel superior/lateral.
   - **Alternância de Turno:** Alterne entre 1º e 2º Turno com um clique.
3. **Abas de Análise:**
   - **Geral:** Identificação do local de votação, município, modelo da urna, resumo de comparecimento e abstenção.
   - **Cargos (Presidente, Governador, Prefeito, etc.):** Distribuição detalhada de votos nominais, votos em legenda, brancos e nulos com gráficos comparativos.
   - **Auditoria:** Relatório com dezenas de itens verificados automaticamente (fechamento matemático, integridade de logs, horários de votação).
   - **Log de Urna:** Timeline de operações da urna (zerésima, início às 08h, eleitores votando, encerramento às 17h, encerramento oficial e geração de arquivos).
   - **Inspetor ASN.1:** Navegação hierárquica na estrutura binária dos dados.

---

## 🛠️ Instalação e Execução Local

### Pré-requisitos
- **Node.js** v18 ou superior instalado.
- **npm** (incluso no Node.js).

### Passos de Instalação

```bash
# 1. Clone o repositório
git clone <URL_DO_REPOSITORIO>
cd tabulador-urna-eletronica

# 2. Instale as dependências
npm install

# 3. Inicie o servidor de desenvolvimento
npm run dev
```

Acesse **[http://localhost:3000](http://localhost:3000)** no seu navegador.

### Build de Produção

```bash
# Compilar projeto
npm run build

# Iniciar servidor em modo produção
npm start
```

---

## 📂 Estrutura do Projeto

```text
tabulador-urna-eletronica/
├── storage/                            # Dados indexados por zona, seção e turno
│   └── zona_XXXX/secao_YYYY/turno_Z/
├── src/
│   ├── app/
│   │   ├── api/                        # Rotas de API (upload, boletim, log, auditoria, consolidado, secoes, asn1)
│   │   ├── globals.css                 # Configuração do Tailwind CSS
│   │   ├── layout.tsx                  # Layout raiz
│   │   └── page.tsx                    # Dashboard principal com navegação por abas
│   ├── components/ui/                  # Componentes reutilizáveis (Card, Badge, StatCard)
│   └── features/
│       ├── asn1-inspector/             # Parser e decodificador da árvore ASN.1/BER
│       ├── auditoria/                  # Mecanismo de regras de auditoria e reconciliação cruzada
│       ├── boletim-urna/               # Decodificador de BU e totalização de candidatos
│       ├── consolidado/                # Motor de agregação multi-seções
│       ├── log-urna/                   # Descompactador e analisador cronológico de .jez (logd.dat)
│       └── storage/                    # Gerenciador de persistência local em disco
├── package.json
├── tailwind.config.js
└── tsconfig.json
```
