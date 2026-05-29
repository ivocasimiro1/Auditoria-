import { getDb } from '../db';

interface TeamDef {
  code: string;
  name: string;
  group: string;
  players: string[];
}

const TEAMS: TeamDef[] = [
  // Group A
  { code: 'USA', name: 'Estados Unidos', group: 'A', players: ['Turner', 'Dest', 'Richards', 'Long', 'Robinson', 'McKennie', 'Adams', 'Musah', 'Pulisic', 'Weah', 'Balogun'] },
  { code: 'MEX', name: 'México', group: 'A', players: ['Ochoa', 'Araujo', 'Moreno', 'Montes', 'Gallardo', 'Herrera', 'Guardado', 'Lozano', 'Vega', 'Martin', 'Jimenez'] },
  { code: 'CAN', name: 'Canadá', group: 'A', players: ['Borjan', 'Johnston', 'Miller', 'Henry', 'Laryea', 'Eustaquio', 'Hutchinson', 'David', 'Buchanan', 'Larin', 'Davies'] },
  { code: 'PAN', name: 'Panamá', group: 'A', players: ['Penedo', 'Murillo', 'Davis', 'Escobar', 'Walder', 'Parris', 'Quintero', 'Godoy', 'Anderson', 'Fajardo', 'Tejada'] },
  // Group B
  { code: 'ENG', name: 'Inglaterra', group: 'B', players: ['Pickford', 'Alexander-Arnold', 'Maguire', 'Stones', 'Shaw', 'Rice', 'Bellingham', 'Saka', 'Foden', 'Rashford', 'Kane'] },
  { code: 'ARG', name: 'Argentina', group: 'B', players: ['Martinez', 'Molina', 'Romero', 'Otamendi', 'Acuna', 'De Paul', 'Mac Allister', 'Fernandez', 'Dybala', 'Di Maria', 'Messi'] },
  { code: 'NED', name: 'Países Baixos', group: 'B', players: ['Flekken', 'Dumfries', 'De Vrij', 'Van Dijk', 'Blind', 'De Jong', 'Koopmeiners', 'Frimpong', 'Xavi Simons', 'Depay', 'Gakpo'] },
  { code: 'SEN', name: 'Senegal', group: 'B', players: ['Mendy', 'Sabaly', 'Koulibaly', 'Diallo', 'Jakobs', 'Kouyate', 'Gueye', 'Sarr', 'Mane', 'Diatta', 'Dia'] },
  // Group C
  { code: 'FRA', name: 'França', group: 'C', players: ['Maignan', 'Pavard', 'Upamecano', 'Konate', 'Hernandez', 'Camavinga', 'Tchouameni', 'Griezmann', 'Dembele', 'Thuram', 'Mbappe'] },
  { code: 'BRA', name: 'Brasil', group: 'C', players: ['Alisson', 'Danilo', 'Marquinhos', 'Militao', 'Telles', 'Fabinho', 'Casemiro', 'Neymar', 'Raphinha', 'Vinicius Jr', 'Rodrygo'] },
  { code: 'BEL', name: 'Bélgica', group: 'C', players: ['Casteels', 'Castagne', 'Vertonghen', 'Alderweireld', 'Theate', 'Witsel', 'Tielemans', 'Mertens', 'De Bruyne', 'Lukaku', 'Hazard'] },
  { code: 'MAR', name: 'Marrocos', group: 'C', players: ['Bounou', 'Hakimi', 'Saiss', 'Aguerd', 'Mazraoui', 'Amrabat', 'Ounahi', 'Ziyech', 'En-Nesyri', 'Boufal', 'Benoun'] },
  // Group D
  { code: 'POR', name: 'Portugal', group: 'D', players: ['Costa', 'Cancelo', 'Pepe', 'Dias', 'Guerreiro', 'Carvalho', 'Neves', 'Fernandes', 'Leao', 'Felix', 'Ronaldo'] },
  { code: 'ESP', name: 'Espanha', group: 'D', players: ['Simon', 'Carvajal', 'Laporte', 'Torres', 'Alba', 'Busquets', 'Pedri', 'Gavi', 'Asensio', 'Morata', 'Torres F'] },
  { code: 'GER', name: 'Alemanha', group: 'D', players: ['Neuer', 'Kimmich', 'Rudiger', 'Schlotterbeck', 'Raum', 'Goretzka', 'Kroos', 'Musiala', 'Sane', 'Havertz', 'Gnabry'] },
  { code: 'JPN', name: 'Japão', group: 'D', players: ['Gonda', 'Yamane', 'Itakura', 'Yoshida', 'Nagatomo', 'Endo', 'Morita', 'Kamada', 'Doan', 'Minamino', 'Ueda'] },
  // Group E
  { code: 'URU', name: 'Uruguai', group: 'E', players: ['Rochet', 'Vina', 'Gimenez', 'Godin', 'Olivera', 'Valverde', 'Bentancur', 'De Arrascaeta', 'Cavani', 'Suarez', 'Nunez'] },
  { code: 'COL', name: 'Colômbia', group: 'E', players: ['Vargas', 'Arias', 'Sanchez', 'Cuesta', 'Mojica', 'Lerma', 'Barrios', 'Carrascal', 'Cuadrado', 'Vidal A', 'Falcao'] },
  { code: 'KOR', name: 'Coreia do Sul', group: 'E', players: ['Kim S', 'Kim T', 'Kim M', 'Jung', 'Lee', 'Hwang I', 'Son', 'Hwang H', 'Kwon', 'Cho', 'Oh'] },
  { code: 'CMR', name: 'Camarões', group: 'E', players: ['Epassy', 'Fai', 'Nkoulou', 'Anguissa F', 'Tolo', 'Anguissa A', 'Zambo', 'Toko Ekambi', 'Choupo', 'Mbeumo', 'Aboubakar'] },
  // Group F
  { code: 'CRO', name: 'Croácia', group: 'F', players: ['Livakovic', 'Juranovic', 'Lovren', 'Gvardiol', 'Sosa', 'Kovacic', 'Brozovic', 'Modric', 'Vlasic', 'Kramaric', 'Perisic'] },
  { code: 'AUS', name: 'Austrália', group: 'F', players: ['Ryan', 'Degenek', 'Rowles', 'Souttar', 'Atkinson', 'Mooy', 'Irvine', 'Leckie', 'McGree', 'Duke', 'Hrustic'] },
  { code: 'NGA', name: 'Nigéria', group: 'F', players: ['Uzoho', 'Aina', 'Troost-Ekong', 'Bassey', 'Tsimikas', 'Ndidi', 'Iwobi', 'Lookman', 'Simon', 'Osimhen', 'Chukwueze'] },
  { code: 'POL', name: 'Polónia', group: 'F', players: ['Szczesny', 'Cash', 'Glik', 'Kiwior', 'Bereszynski', 'Bielik', 'Krychowiak', 'Zielinski', 'Frankowski', 'Lewandowski', 'Swiderski'] },
  // Group G
  { code: 'ITA', name: 'Itália', group: 'G', players: ['Donnarumma', 'Di Lorenzo', 'Bonucci', 'Bastoni', 'Spinazzola', 'Barella', 'Jorginho', 'Verratti', 'Chiesa', 'Immobile', 'Raspadori'] },
  { code: 'SUI', name: 'Suíça', group: 'G', players: ['Sommer', 'Widmer', 'Akanji', 'Elvedi', 'Rodriguez', 'Freuler', 'Xhaka', 'Shaqiri', 'Seferovic', 'Embolo', 'Zuber'] },
  { code: 'ECU', name: 'Equador', group: 'G', players: ['Dominguez', 'Preciado', 'Torres', 'Hincapie', 'Estupinan', 'Caicedo', 'Gruezo', 'Plata', 'Sarmiento', 'Valencia', 'Mena'] },
  { code: 'GHA', name: 'Gana', group: 'G', players: ['Ati-Zigi', 'Lamptey', 'Salisu', 'Amartey', 'Mensah', 'Partey', 'Salis', 'Kudus', 'Ayew J', 'Ayew A', 'Williams'] },
  // Group H
  { code: 'DEN', name: 'Dinamarca', group: 'H', players: ['Schmeichel', 'Andersen', 'Christensen', 'Kjaer', 'Maehle', 'Hojbjerg', 'Delaney', 'Eriksen', 'Lindstrom', 'Dolberg', 'Braithwaite'] },
  { code: 'TUN', name: 'Tunísia', group: 'H', players: ['Dahmen', 'Talbi', 'Meriah', 'Bronn', 'Abdi', 'Chaalali', 'Laifaoui', 'Ben Slimane', 'Jebali', 'Jaziri', 'Khazri'] },
  { code: 'MEX2', name: 'México B', group: 'H', players: ['Rodriguez', 'Aguirre', 'Dominguez', 'Flores', 'Cruz', 'Juarez', 'Pineda', 'Alvarado', 'Beltran', 'Sanchez', 'Quinones'] },
  { code: 'NZL', name: 'Nova Zelândia', group: 'H', players: ['Sail', 'Thomas', 'Cacace', 'Just', 'Waine', 'McGlinchey', 'Bell', 'Barbarouses', 'Wood', 'Boxall', 'Garbett'] },
  // Group I
  { code: 'SAU', name: 'Arábia Saudita', group: 'I', players: ['Al-Owais', 'Al-Shahrani', 'Al-Tambakti', 'Al-Ghannam', 'Al-Burayk', 'Al-Faraj', 'Kanno', 'Al-Dawsari', 'Al-Shehri', 'Al-Buraikan', 'Saleh'] },
  { code: 'IRN', name: 'Irão', group: 'I', players: ['Beiranvand', 'Mohammadi', 'Pouraliganji', 'Cheshmi', 'Rezaeian', 'Ezatolahi', 'Noorollahi', 'Jahanbakhsh', 'Gholizadeh', 'Taremi', 'Azmoun'] },
  { code: 'WAL', name: 'País de Gales', group: 'I', players: ['Ward', 'Roberts', 'Mepham', 'Davies', 'Gunter', 'Ampadu', 'Ramsey', 'Allen', 'James', 'Wilson', 'Bale'] },
  { code: 'CRC', name: 'Costa Rica', group: 'I', players: ['Navas', 'Matarrita', 'Duarte', 'Waston', 'Oviedo', 'Borges', 'Tejeda', 'Campbell', 'Contreras', 'Ruiz', 'Venegas'] },
  // Group J
  { code: 'SRB', name: 'Sérvia', group: 'J', players: ['Milinkovic', 'Milenkovic', 'Pavlovic', 'Veljkovic', 'Zivkovic', 'Maksimovic', 'Gudelj', 'Tadic', 'Kostic', 'Mitrovic', 'Jovic'] },
  { code: 'CMR2', name: 'Camarões B', group: 'J', players: ['Epassy', 'Fai', 'Nkoulou', 'Ngadeu', 'Tolo', 'Anguissa', 'Zambo', 'Toko', 'Choupo', 'Mbeumo', 'Aboubakar'] },
  { code: 'EGY', name: 'Egito', group: 'J', players: ['El-Hadary', 'Kahraba', 'Hegazy', 'Ashraf', 'Sayed', 'Elneny', 'Hamed', 'Mohamed', 'Trezeguet', 'Salah', 'Marmoush'] },
  { code: 'SCO', name: 'Escócia', group: 'J', players: ['Gordon', 'Hickey', 'McKenna', 'Hanley', 'Robertson', 'McGregor', 'Gilmour', 'McGinn', 'Christie', 'Adams', 'Dykes'] },
  // Group K
  { code: 'AUT', name: 'Áustria', group: 'K', players: ['Pentz', 'Posch', 'Lienhart', 'Hinteregger', 'Alaba', 'Grillitsch', 'Laimer', 'Sabitzer', 'Baumgartner', 'Arnautovic', 'Gregoritsch'] },
  { code: 'TUR', name: 'Turquia', group: 'K', players: ['Cakir', 'Celik', 'Soyuncu', 'Demiral', 'Muldur', 'Ayhan', 'Calhanoglu', 'Yazici', 'Under', 'Yilmaz', 'Tosun'] },
  { code: 'QAT', name: 'Qatar', group: 'K', players: ['Al-Sheeb', 'Pedro Miguel', 'Salman', 'Khoukhi', 'Hassan', 'Al-Haydos', 'Boudiaf', 'Muneer', 'Afif', 'Ali', 'Almoos'] },
  { code: 'HND', name: 'Honduras', group: 'K', players: ['Munoz', 'Discua', 'Figueroa', 'Meija', 'Benguche', 'Obando', 'Palma', 'Quioto', 'Elis', 'Pereira', 'Lozano'] },
  // Group L
  { code: 'MEX3', name: 'México C', group: 'L', players: ['Memo', 'Jorge', 'Rafael', 'Diego', 'Carlos', 'Miguel', 'Luis', 'Angel', 'Roberto', 'Fernando', 'Marco'] },
  { code: 'SVK', name: 'Eslováquia', group: 'L', players: ['Dubravka', 'Pekarik', 'Skriniar', 'Vavro', 'Hancko', 'Kucka', 'Lobotka', 'Duda', 'Haraslin', 'Hamsik', 'Bozenik'] },
  { code: 'CMV', name: 'Cabo Verde', group: 'L', players: ['Vozinha', 'Stopira', 'Rony Lopes', 'Kenny', 'Fali', 'Patrick', 'Liss', 'Garry', 'Ianique', 'Julio', 'Ze Luis'] },
  { code: 'VEN', name: 'Venezuela', group: 'L', players: ['Graterol', 'Chancellor', 'Ferraresi', 'Osorio', 'Canobbio', 'Herrera', 'Rincon', 'Soteldo', 'Bello', 'Rondon', 'Murillo'] },
];

const SPECIAL_CARDS = [
  { id: 'SP-001', name: 'Troféu FIFA World Cup', type: 'special' as const, rarity: 'holographic' as const },
  { id: 'SP-002', name: 'Mascote Oficial 2026', type: 'special' as const, rarity: 'holographic' as const },
  { id: 'SP-003', name: 'Logotipo Mundial 2026', type: 'logo' as const, rarity: 'foil' as const },
  { id: 'SP-004', name: 'Estádio MetLife - EUA', type: 'stadium' as const, rarity: 'common' as const },
  { id: 'SP-005', name: 'Estádio Azteca - México', type: 'stadium' as const, rarity: 'common' as const },
  { id: 'SP-006', name: 'Estádio BC Place - Canadá', type: 'stadium' as const, rarity: 'common' as const },
  { id: 'SP-007', name: 'Best XI Panini', type: 'special' as const, rarity: 'holographic' as const },
  { id: 'SP-008', name: 'Top Scorer Award', type: 'special' as const, rarity: 'holographic' as const },
  { id: 'SP-009', name: 'Golden Glove Award', type: 'special' as const, rarity: 'foil' as const },
  { id: 'SP-010', name: 'Best Young Player', type: 'special' as const, rarity: 'foil' as const },
];

export function seedStickers(): void {
  const db = getDb();

  const count = (db.prepare('SELECT COUNT(*) as c FROM stickers').get() as { c: number }).c;
  if (count > 0) return;

  const insert = db.prepare(`
    INSERT OR IGNORE INTO stickers (id, number, team_code, team_name, group_name, player_name, card_type, rarity, image_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction(() => {
    let num = 1;

    for (const team of TEAMS) {
      // Badge card
      insert.run(
        `${team.code}-BADGE`, num++, team.code, team.name, team.group,
        null, 'badge', 'foil', `/img/badges/${team.code.toLowerCase()}.svg`
      );

      // Team logo
      insert.run(
        `${team.code}-LOGO`, num++, team.code, team.name, team.group,
        null, 'logo', 'common', `/img/logos/${team.code.toLowerCase()}.svg`
      );

      // Players
      team.players.forEach((player, i) => {
        const rarity = i === 0 ? 'foil' : (i === team.players.length - 1 ? 'holographic' : 'common');
        insert.run(
          `${team.code}-P${String(i + 1).padStart(2, '0')}`, num++, team.code, team.name, team.group,
          player, 'player', rarity, `/img/players/${team.code.toLowerCase()}_${i + 1}.svg`
        );
      });
    }

    // Special cards
    SPECIAL_CARDS.forEach((sp) => {
      insert.run(
        sp.id, num++, 'SPECIAL', 'Especial', 'ESPECIAL',
        sp.name, sp.type, sp.rarity, `/img/specials/${sp.id.toLowerCase()}.svg`
      );
    });
  });

  insertMany();
  console.log('Stickers seeded successfully');
}
