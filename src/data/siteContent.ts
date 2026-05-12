export type ChampionshipStatus = "Em andamento" | "Inscrições abertas" | "Em breve";

export interface HomeStat {
  label: string;
  value: number;
}

export interface Championship {
  name: string;
  type: string;
  status: ChampionshipStatus;
  players: number;
  prize: string;
  summary: string;
  nextWindow: string;
}

export interface ChampionRecord {
  rank: number;
  name: string;
  titles: number;
  highlight?: boolean;
}

interface ChampionSource {
  name: string;
  titles: number;
}

export interface ChampionsThemeConfig {
  title: string;
  source: string;
  sourceType: "file" | "url";
  autoplay: boolean;
  loop: boolean;
  volume: number;
}

export interface RankingPlayer {
  rank: number;
  name: string;
  points: number;
  wins: number;
  titles: number;
  trend: string;
}

export interface RankingView {
  key: string;
  label: string;
  description: string;
  players: RankingPlayer[];
}

export interface LeagueRow {
  pos: number;
  name: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goals: string;
  points: number;
}

export interface LightningCup {
  name: string;
  format: string;
  status: ChampionshipStatus;
  slots: string;
  startTime: string;
  duration: string;
  reward: string;
  summary: string;
}

export interface HelpTopic {
  question: string;
  answer: string;
}

export const aboutStory = [
  "O grupo começou com Idson, Alan e Lucas, que se reuniam para jogar, conversar e compartilhar o sonho de criar uma comunidade entre amigos.",
  "A ideia era trocar informações sobre o jogo, organizar campeonatos e promover outras atividades. Desde então, o grupo segue ativo, com a entrada de novos jogadores após entrevistas cuidadosas, nas quais são explicadas as regras e os valores.",
  "Apesar de ser um grupo de amigos, o respeito e a resenha saudável seguem como base da convivência, o que tem garantido sua continuidade até hoje.",
];

export const operationalSupport = {
  phone: "557192630851",
  defaultMessage: "Olá, preciso de atendimento.",
  whatsappUrl:
    "https://wa.me/557192630851?text=Ol%C3%A1%2C%20preciso%20de%20atendimento.",
};

export const homeStats: HomeStat[] = [
  { label: "Partidas", value: 0 },
  { label: "Jogadores", value: 0 },
  { label: "Campeonatos", value: 0 },
  { label: "Títulos", value: 0 },
];

export const championships: Championship[] = [];

export const featuredChampionships = championships.slice(0, 4);

const officialChampionEntries: ChampionSource[] = [
  { name: "Wendel", titles: 1 },
  { name: "Henrique", titles: 1 },
  { name: "Evelto", titles: 2 },
  { name: "Foguinho", titles: 1 },
  { name: "Alan", titles: 4 },
  { name: "Leandro", titles: 1 },
];

function normalizeChampionName(value: string) {
  return value.trim().toLocaleLowerCase("pt-BR");
}

function buildChampionRecords(entries: ChampionSource[]): ChampionRecord[] {
  const groupedChampions = new Map<string, ChampionSource>();

  entries.forEach((entry) => {
    const name = entry.name.trim();
    const key = normalizeChampionName(name);
    const existing = groupedChampions.get(key);

    if (existing) {
      groupedChampions.set(key, {
        name: existing.name,
        titles: existing.titles + entry.titles,
      });
      return;
    }

    groupedChampions.set(key, { name, titles: entry.titles });
  });

  const orderedChampions = Array.from(groupedChampions.values()).sort((left, right) => {
    if (right.titles !== left.titles) {
      return right.titles - left.titles;
    }

    return left.name.localeCompare(right.name, "pt-BR");
  });

  const highestTitleCount = orderedChampions[0]?.titles ?? 0;

  return orderedChampions.map((player, index) => ({
    rank: index + 1,
    name: player.name,
    titles: player.titles,
    highlight: highestTitleCount > 0 && player.titles === highestTitleCount,
  }));
}

export const champions = buildChampionRecords(officialChampionEntries);

export const championsTheme: ChampionsThemeConfig = {
  title: "Queen - We Are The Champions",
  source: "/audio/queen-we-are-the-champions.mp3",
  sourceType: "file",
  autoplay: true,
  loop: true,
  volume: 0.8,
};

export const rankingViews: RankingView[] = [
  {
    key: "global",
    label: "Global",
    description:
      "A temporada ainda não começou. Os primeiros pontos aparecerão aqui após os resultados oficiais.",
    players: [],
  },
  {
    key: "monthly",
    label: "Mensal",
    description:
      "O recorte mensal será preenchido assim que as primeiras partidas do mês forem concluídas.",
    players: [],
  },
  {
    key: "titles",
    label: "Por títulos",
    description:
      "O histórico de títulos será construído a partir das primeiras finais oficiais do portal.",
    players: [],
  },
];

export const leagueTable: LeagueRow[] = [];

export const lightningCups: LightningCup[] = [];

export const helpTopics: HelpTopic[] = [
  {
    question: "Como entro em um campeonato?",
    answer:
      "Abra a página de campeonatos, confira o formato e o prazo da inscrição, e confirme sua vaga com a organização pelo canal oficial.",
  },
  {
    question: "Como funciona o ranking?",
    answer:
      "O ranking combina pontuação por desempenho, vitórias e campanhas recentes. As abas mostram visões diferentes do mesmo grupo de competidores.",
  },
  {
    question: "Posso criar um torneio relâmpago?",
    answer:
      "Sim. Os torneios relâmpago seguem janelas curtas e precisam de formato, horário e número de vagas definidos antes da publicação.",
  },
  {
    question: "Onde peço suporte?",
    answer:
      "Use a área de ajuda para centralizar dúvidas operacionais, problemas de agenda e correções de placar com a equipe de moderação.",
  },
];

export const loginHighlights = [
  "Acompanhe suas inscrições e calendários em um só lugar.",
  "Receba avisos quando suas rodadas forem liberadas.",
  "Tenha acesso rápido ao histórico de títulos, ranking e desempenho.",
];
