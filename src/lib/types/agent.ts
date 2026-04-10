export interface AgentInfo {
  name: string;
  description: string;
  model: "opus" | "sonnet" | "haiku";
}

export const AGENTS: AgentInfo[] = [
  {
    name: "pesquisador-documental",
    description: "Busca e extrai informações nos autos do processo",
    model: "haiku",
  },
  {
    name: "validador-probatorio",
    description: "Verifica afirmações factuais contra fontes originais",
    model: "opus",
  },
  {
    name: "critico-judicial",
    description: "Simula juiz federal avaliando a peça",
    model: "opus",
  },
  {
    name: "revisor-completude",
    description: "Verifica elementos obrigatórios da peça",
    model: "sonnet",
  },
  {
    name: "revisor-estilo",
    description: "Verifica aderência ao CLAUDE.md",
    model: "sonnet",
  },
  {
    name: "analista-prescricao",
    description: "Calcula prescrição com cálculo dual",
    model: "sonnet",
  },
  {
    name: "indexador",
    description: "Indexa PDFs do processo",
    model: "sonnet",
  },
  {
    name: "arquiteto-fluxo-claude",
    description: "Analisa e otimiza o workflow",
    model: "opus",
  },
];

export interface AgentRunStatus {
  id: string;
  agentName: string;
  status: "pending" | "running" | "completed" | "failed";
  progress?: number;
  output?: string;
}
