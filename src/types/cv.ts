export interface CVExperience {
  empresa: string;
  cargo: string;
  periodo: string;
  localizacao: string;
  descricao: string;
  responsabilidades: string[];
  resultados: string[];
}

export interface CVFormacao {
  curso: string;
  instituicao: string;
  nivel: string;
  periodo: string;
}

export interface CVData {
  nome: string;
  cargo_titulo: string;
  email: string;
  telefone: string;
  linkedin: string;
  localizacao: string;
  resumo: string;
  experiencias: CVExperience[];
  formacao: CVFormacao[];
  idiomas: string[];
}
