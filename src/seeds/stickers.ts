import { queryOne, execute, transaction } from '../db';

interface TeamDef {
  code: string;
  name: string;
  group: string;
  players: string[];
}

const TEAMS: TeamDef[] = [
  // Group A
  {
    code: 'MEX', name: 'México', group: 'A',
    players: ['Ochoa', 'Talavera', 'Araujo', 'Moreno', 'Montes', 'Gallardo', 'Herrera', 'Guardado', 'Lozano', 'Vega', 'Martin', 'Jimenez', 'Antuna', 'Pineda', 'Rodriguez', 'Alvarado', 'Gutierrez', 'Sanchez'],
  },
  {
    code: 'ZAF', name: 'África do Sul', group: 'A',
    players: ['Williams', 'Petersen', 'Tau', 'Dolly', 'Mkhize', 'Zungu', 'Hlanti', 'Broos', 'Maja', 'Foster', 'Mothiba', 'Phiri', 'Kekana', 'Mobbie', 'Lakay', 'Maart', 'Adams', 'Mswati'],
  },
  {
    code: 'KOR', name: 'Coreia do Sul', group: 'A',
    players: ['Kim Seung-gyu', 'Jo Hyeon-woo', 'Kim Min-jae', 'Jung Seung-hyun', 'Lee Yong', 'Kim Jin-su', 'Hwang In-beom', 'Son Heung-min', 'Hwang Hee-chan', 'Kwon Chang-hoon', 'Cho Gue-sung', 'Oh Hyeon-gyu', 'Lee Kang-in', 'Jung Woo-young', 'Paik Seung-ho', 'Song Min-kyu', 'Jeong Sang-bin', 'Kim Young-gwon'],
  },
  {
    code: 'CZE', name: 'Chéquia', group: 'A',
    players: ['Stanek', 'Vaclik', 'Coufal', 'Kaderabek', 'Celustka', 'Kalas', 'Soucek', 'Kral', 'Barak', 'Jankto', 'Schick', 'Hlozek', 'Pesek', 'Kuchta', 'Cerny', 'Provod', 'Lingr', 'Sadílek'],
  },

  // Group B
  {
    code: 'CAN', name: 'Canadá', group: 'B',
    players: ['Borjan', 'St. Clair', 'Johnston', 'Miller', 'Henry', 'Laryea', 'Eustaquio', 'Hutchinson', 'David', 'Buchanan', 'Larin', 'Davies', 'Osorio', 'Adekugbe', 'Waterman', 'Hoilett', 'Ugbo', 'Cavallini'],
  },
  {
    code: 'BIH', name: 'Bósnia-Herzegovina', group: 'B',
    players: ['Sehic', 'Piric', 'Hadziahmetovic', 'Kovacevic', 'Civic', 'Kolasinac', 'Pjanic', 'Saric', 'Visca', 'Dzeko', 'Prevljak', 'Krunic', 'Stevanovic', 'Hajradinovic', 'Nanic', 'Tahirovic', 'Gigovic', 'Gazibegovic'],
  },
  {
    code: 'QAT', name: 'Qatar', group: 'B',
    players: ['Al-Sheeb', 'Barsham', 'Pedro Miguel', 'Al-Rawi', 'Salman', 'Khoukhi', 'Hassan', 'Al-Haydos', 'Boudiaf', 'Muneer', 'Afif', 'Ali', 'Almoos', 'Al-Moez', 'Ismail', 'Waad', 'Homam', 'Asad'],
  },
  {
    code: 'SUI', name: 'Suíça', group: 'B',
    players: ['Sommer', 'Kobel', 'Widmer', 'Akanji', 'Elvedi', 'Rodriguez', 'Freuler', 'Xhaka', 'Shaqiri', 'Seferovic', 'Embolo', 'Zuber', 'Vargas', 'Fabian Rieder', 'Steffen', 'Okafor', 'Ndoye', 'Duah'],
  },

  // Group C
  {
    code: 'BRA', name: 'Brasil', group: 'C',
    players: ['Alisson', 'Ederson', 'Danilo', 'Marquinhos', 'Militao', 'Arana', 'Casemiro', 'Lucas Paquetá', 'Raphinha', 'Vinicius Jr', 'Rodrygo', 'Endrick', 'Gabriel Martinelli', 'Bruno Guimarães', 'Gerson', 'Savinho', 'Igor Jesus', 'Matheus Cunha'],
  },
  {
    code: 'MAR', name: 'Marrocos', group: 'C',
    players: ['Bounou', 'Munir', 'Hakimi', 'Saiss', 'Aguerd', 'Mazraoui', 'Amrabat', 'Ounahi', 'Ziyech', 'En-Nesyri', 'Boufal', 'Cheddira', 'El Yamiq', 'Dari', 'Benoun', 'Azzedine Ounahi', 'Sabiri', 'El Khannouss'],
  },
  {
    code: 'HAI', name: 'Haiti', group: 'C',
    players: ['Voltaire', 'Placide', 'Rosefort', 'Pierre', 'Jean-Baptiste', 'Chery', 'Altidor', 'Thard', 'Herold', 'Jerome', 'Pierre-Louis', 'Antoine', 'Germain', 'Nazon', 'Duplessis', 'Thermitus', 'Casimir', 'Desrosiers'],
  },
  {
    code: 'SCO', name: 'Escócia', group: 'C',
    players: ['Gordon', 'Clark', 'Hickey', 'McKenna', 'Hanley', 'Robertson', 'McGregor', 'Gilmour', 'McGinn', 'Christie', 'Adams', 'Dykes', 'McLean', 'Armstrong', 'Tierney', 'Patterson', 'Forrest', 'Nisbet'],
  },

  // Group D
  {
    code: 'USA', name: 'Estados Unidos', group: 'D',
    players: ['Turner', 'Horvath', 'Dest', 'Richards', 'Long', 'Robinson', 'McKennie', 'Adams', 'Musah', 'Pulisic', 'Weah', 'Balogun', 'Reyna', 'Acosta', 'Scally', 'Busio', 'Wright', 'Tillman'],
  },
  {
    code: 'PAR', name: 'Paraguai', group: 'D',
    players: ['Silva', 'Fernandez', 'Alonso', 'Gomez', 'Alderete', 'Balbuena', 'Cubas', 'Villasanti', 'Almada', 'Sanabria', 'Romero', 'Enciso', 'Bogado', 'Gómez M', 'Sosa', 'Gonzalez', 'Rojas', 'Martinez'],
  },
  {
    code: 'AUS', name: 'Austrália', group: 'D',
    players: ['Ryan', 'Redmayne', 'Degenek', 'Rowles', 'Souttar', 'Atkinson', 'Mooy', 'Irvine', 'Leckie', 'McGree', 'Duke', 'Hrustic', 'Devlin', 'Goodwin', 'Nabbout', 'Mabil', 'Najjar', 'Jamieson'],
  },
  {
    code: 'TUR', name: 'Turquia', group: 'D',
    players: ['Mert Gunok', 'Uğurcan Çakır', 'Zeki Çelik', 'Samet Akaydin', 'Merih Demiral', 'Ferdi Kadıoğlu', 'Salih Özcan', 'Hakan Çalhanoğlu', 'Kerem Aktürkoğlu', 'Arda Güler', 'Barış Alper Yılmaz', 'Cenk Tosun', 'Orkun Kökçü', 'Kaan Ayhan', 'Mert Müldür', 'İrfan Can Kahveci', 'Abdülkerim Bardakcı', 'Serdar Dursun'],
  },

  // Group E
  {
    code: 'GER', name: 'Alemanha', group: 'E',
    players: ['Neuer', 'ter Stegen', 'Kimmich', 'Rudiger', 'Schlotterbeck', 'Raum', 'Goretzka', 'Kroos', 'Musiala', 'Sane', 'Havertz', 'Gnabry', 'Wirtz', 'Brandt', 'Gundogan', 'Mittelstadt', 'Fullkrug', 'Kleindienst'],
  },
  {
    code: 'CUW', name: 'Curaçao', group: 'E',
    players: ['Eloy Room', 'Cuco Martina', 'Rangelo Janga', 'Gevaro Nepomuceno', 'Gilkeson Leonce', 'Quentin Thurlings', 'Steffan Peeters', 'Nigel Thomas', 'Leandro Bacuna', 'Jurickson Profar', 'Phendependency Korevaar', 'Regilio Doelwijt', 'Gideon van Wyk', 'Brandley Kuwas', 'Darryl Lachman', 'Vurnon Anita', 'Rajiv van La Parra', 'Kelvin Leerdam'],
  },
  {
    code: 'CIV', name: 'Costa do Marfim', group: 'E',
    players: ['Fofana', 'Sangare', 'Badra Sangare', 'Deli', 'Konan', 'Zaha', 'Kessie', 'Seri', 'Pepe N', 'Pépé', 'Haller', 'Cornet', 'Gradel', 'Boly', 'Aurier', 'Fae', 'Diallo', 'Dao'],
  },
  {
    code: 'ECU', name: 'Equador', group: 'E',
    players: ['Dominguez', 'Galindez', 'Preciado', 'Torres', 'Hincapie', 'Estupinan', 'Caicedo', 'Gruezo', 'Plata', 'Sarmiento', 'Valencia', 'Mena', 'Yeboah', 'Cifuentes', 'Arboleda', 'Ibarra', 'Minda', 'Mercado'],
  },

  // Group F
  {
    code: 'NED', name: 'Países Baixos', group: 'F',
    players: ['Flekken', 'Bijlow', 'Dumfries', 'De Vrij', 'Van Dijk', 'Timber', 'De Jong', 'Koopmeiners', 'Frimpong', 'Xavi Simons', 'Depay', 'Gakpo', 'Reijnders', 'Wieffer', 'Veerman', 'Gravenberch', 'Brobbey', 'Weghorst'],
  },
  {
    code: 'JPN', name: 'Japão', group: 'F',
    players: ['Gonda', 'Zion', 'Yamane', 'Itakura', 'Yoshida', 'Nagatomo', 'Endo', 'Morita', 'Kamada', 'Doan', 'Minamino', 'Ueda', 'Kubo', 'Mitoma', 'Tanaka', 'Maeda', 'Furuhashi', 'Asano'],
  },
  {
    code: 'SWE', name: 'Suécia', group: 'F',
    players: ['Olsen', 'Nordfeldt', 'Krafth', 'Lindelof', 'Danielson', 'Augustinsson', 'Olsson', 'Ekdal', 'Forsberg', 'Isak', 'Gyokeres', 'Claesson', 'Svanberg', 'Kulusevski', 'Elanga', 'Dahoud', 'Bengtsson', 'Asoro'],
  },
  {
    code: 'TUN', name: 'Tunísia', group: 'F',
    players: ['Dahmen', 'Jemal', 'Talbi', 'Meriah', 'Bronn', 'Abdi', 'Chaalali', 'Laifaoui', 'Ben Slimane', 'Jebali', 'Jaziri', 'Khazri', 'Sliti', 'Maaloul', 'Ben Romdhane', 'Skhiri', 'Ghandri', 'Mathlouthi'],
  },

  // Group G
  {
    code: 'BEL', name: 'Bélgica', group: 'G',
    players: ['Casteels', 'Mignolet', 'Castagne', 'Vertonghen', 'Alderweireld', 'Theate', 'Witsel', 'Tielemans', 'Mertens', 'De Bruyne', 'Lukaku', 'Doku', 'Onana', 'Mangala', 'De Ketelaere', 'Openda', 'Bakayoko', 'Hazard'],
  },
  {
    code: 'EGY', name: 'Egito', group: 'G',
    players: ['El-Shenawy', 'Gabaski', 'Kahraba', 'Hegazy', 'Ashraf', 'Sayed', 'Elneny', 'Hamed', 'Mohamed', 'Trezeguet', 'Salah', 'Marmoush', 'Hamdi', 'Zizo', 'Mostafa Mohamed', 'Ramadan', 'Soares', 'Hassan'],
  },
  {
    code: 'IRN', name: 'Irão', group: 'G',
    players: ['Beiranvand', 'Hosseini', 'Mohammadi', 'Pouraliganji', 'Cheshmi', 'Rezaeian', 'Ezatolahi', 'Noorollahi', 'Jahanbakhsh', 'Gholizadeh', 'Taremi', 'Azmoun', 'Jalali', 'Hajisafi', 'Amiri', 'Ansarifard', 'Shojaei', 'Torabi'],
  },
  {
    code: 'NZL', name: 'Nova Zelândia', group: 'G',
    players: ['Sail', 'Elliot', 'Thomas', 'Cacace', 'Just', 'Waine', 'McGlinchey', 'Bell', 'Barbarouses', 'Wood', 'Boxall', 'Garbett', 'Coveny', 'Sutton', 'Singh', 'Old', 'Paasi', 'Lea'],
  },

  // Group H
  {
    code: 'ESP', name: 'Espanha', group: 'H',
    players: ['Unai Simon', 'Raya', 'Carvajal', 'Laporte', 'Le Normand', 'Grimaldo', 'Pedri', 'Gavi', 'Rodri', 'Yamal', 'Morata', 'Oyarzabal', 'Fabián Ruiz', 'Dani Olmo', 'Joselu', 'Ferran Torres', 'Williams N', 'Carvajal D'],
  },
  {
    code: 'CMV', name: 'Cabo Verde', group: 'H',
    players: ['Vozinha', 'Platiny', 'Stopira', 'Rony Lopes', 'Kenny', 'Fali', 'Patrick', 'Liss', 'Garry', 'Ianique', 'Julio', 'Ze Luis', 'Ryan Mendes', 'Bebé', 'Gilson', 'Willy Semedo', 'Jamiro', 'Hélio'],
  },
  {
    code: 'SAU', name: 'Arábia Saudita', group: 'H',
    players: ['Al-Owais', 'Al-Rubaie', 'Al-Shahrani', 'Al-Tambakti', 'Al-Ghannam', 'Al-Burayk', 'Al-Faraj', 'Kanno', 'Al-Dawsari', 'Al-Shehri', 'Al-Buraikan', 'Saleh', 'Abdulhamid', 'Bahebri', 'Al-Malki', 'Al-Amri', 'Al-Nemer', 'Asiri'],
  },
  {
    code: 'URU', name: 'Uruguai', group: 'H',
    players: ['Rochet', 'Muslera', 'Vina', 'Gimenez', 'Godin', 'Olivera', 'Valverde', 'Bentancur', 'De Arrascaeta', 'Cavani', 'Nunez', 'Pellistri', 'Ugarte', 'Facundo Torres', 'Maxi Gomez', 'Forlan R', 'Nandez', 'Vecino'],
  },

  // Group I
  {
    code: 'FRA', name: 'França', group: 'I',
    players: ['Maignan', 'Areola', 'Pavard', 'Upamecano', 'Konate', 'Hernandez', 'Camavinga', 'Tchouameni', 'Griezmann', 'Dembele', 'Thuram', 'Mbappé', 'Giroud', 'Rabiot', 'Clauss', 'Zaire-Emery', 'Guendouzi', 'Nkunku'],
  },
  {
    code: 'SEN', name: 'Senegal', group: 'I',
    players: ['Mendy', 'Gomis', 'Sabaly', 'Koulibaly', 'Diallo', 'Jakobs', 'Kouyate', 'Gueye', 'Sarr', 'Mane', 'Diatta', 'Dia', 'Diedhiou', 'Ndiaye', 'Balde', 'Ciss', 'Sow', 'Dieng'],
  },
  {
    code: 'IRQ', name: 'Iraque', group: 'I',
    players: ['Jalal Hassan', 'Mohammed Hameed', 'Ali Adnan', 'Hussein Ali', 'Saad Abd', 'Rebin Sulaka', 'Osama Rashid', 'Bashar Resan', 'Amjad Kalaf', 'Mohanad Ali', 'Aymen Hussein', 'Ahmed Yasin', 'Dana Abdulrazak', 'Ibrahim Bayesh', 'Noor Sabri', 'Mahdi Kamil', 'Karrar Jassim', 'Hammadi Ahmed'],
  },
  {
    code: 'NOR', name: 'Noruega', group: 'I',
    players: ['Ørjan Nyland', 'Rune Jarstein', 'Julian Ryerson', 'Stefan Strandberg', 'Andreas Hanche-Olsen', 'Birger Meling', 'Patrick Berg', 'Sander Berge', 'Martin Ødegaard', 'Mohamed Elyounoussi', 'Erling Haaland', 'Jørgen Strand Larsen', 'Alexander Sørloth', 'Fredrik Aursnes', 'Morten Thorsby', 'Kristoffer Ajer', 'Ola Solbakken', 'Antonio Nusa'],
  },

  // Group J
  {
    code: 'ARG', name: 'Argentina', group: 'J',
    players: ['Emiliano Martinez', 'Rulli', 'Molina', 'Romero', 'Otamendi', 'Acuna', 'De Paul', 'Mac Allister', 'Enzo Fernandez', 'Dybala', 'Di Maria', 'Messi', 'Alvarez J', 'Thiago Almada', 'Tagliafico', 'Lo Celso', 'Palacios', 'Guido Rodriguez'],
  },
  {
    code: 'ALG', name: 'Argélia', group: 'J',
    players: ['Rais M\'Bolhi', 'Mandrea', 'Atal', 'Mandi', 'Benlamri', 'Bensebaini', 'Bennacer', 'Guendouzi A', 'Mahrez', 'Slimani', 'Belaili', 'Brahimi', 'Bounedjah', 'Zerrouki', 'Amoura', 'Belkebla', 'Delort', 'Benrahma'],
  },
  {
    code: 'AUT', name: 'Áustria', group: 'J',
    players: ['Pentz', 'Lindner', 'Posch', 'Lienhart', 'Wober', 'Alaba', 'Grillitsch', 'Laimer', 'Sabitzer', 'Baumgartner', 'Arnautovic', 'Gregoritsch', 'Wimmer', 'Danso', 'Schlager X', 'Querfeld', 'Entrup', 'Prass'],
  },
  {
    code: 'JOR', name: 'Jordânia', group: 'J',
    players: ['Shafi', 'Hasan', 'Al-Bawab', 'Khrisat', 'Al Rawabdeh', 'Hassan Abdel-Fattah', 'Musa', 'Al-Tamari', 'Baha Faisal', 'Yazan Al-Naimat', 'Ahmad Burhan', 'Ibrahim Saif', 'Sedki', 'Al-Zoubi', 'Al-Dardour', 'Musa Al-Taamari', 'Murad', 'Farwaz'],
  },

  // Group K
  {
    code: 'POR', name: 'Portugal', group: 'K',
    players: ['Diogo Costa', 'José Sá', 'Gonçalo Inácio', 'Rúben Dias', 'Nuno Mendes', 'João Cancelo', 'Diogo Dalot', 'Bruno Fernandes', 'Rúben Neves', 'João Neves', 'Bernardo Silva', 'Vitinha', 'Rafael Leão', 'João Félix', 'Gonçalo Ramos', 'Francisco Trincão', 'Pedro Neto', 'Cristiano Ronaldo'],
  },
  {
    code: 'COD', name: 'Congo DR', group: 'K',
    players: ['Matampi', 'Kasongo', 'Ngadeu', 'Boyata', 'Nsimba', 'Luyindama', 'Bongonda', 'Mbemba', 'Kakuta', 'Chadrac Akolo', 'Silas', 'Meschak Elia', 'Chancel Mbemba', 'Paul-José Mpoku', 'Maxwel Cornet', 'Dieumerci Mbokani', 'Yannick Bolasie', 'Cedric Bakambu'],
  },
  {
    code: 'UZB', name: 'Uzbequistão', group: 'K',
    players: ['Yusupov', 'Nesterov', 'Ashurmatov', 'Jaloliddin Masharipov', 'Khurshid Makhmudov', 'Jasur Yakhshiboev', 'Odil Ahmedov', 'Otabek Shukurov', 'Eldor Shomurodov', 'Dostonbek Khamdamov', 'Umid Murtazaev', 'Jaloliddin Abduraimov', 'Alisher Dzhalilov', 'Mansur Jalolov', 'Bobur Abdullaev', 'Asilbek Makhkamov', 'Husain Norchaev', 'Jamshid Iskanderov'],
  },
  {
    code: 'COL', name: 'Colômbia', group: 'K',
    players: ['Vargas', 'Camilo Vargas', 'Arias', 'Sanchez D', 'Cuesta', 'Mojica', 'Lerma', 'Barrios', 'James Rodriguez', 'Cuadrado', 'Luis Diaz', 'Falcao', 'Carrascal', 'Borja', 'Sinisterra', 'Cordoba', 'Muriel', 'Diaz R'],
  },

  // Group L
  {
    code: 'ENG', name: 'Inglaterra', group: 'L',
    players: ['Pickford', 'Ramsdale', 'Alexander-Arnold', 'Maguire', 'Stones', 'Shaw', 'Rice', 'Bellingham', 'Saka', 'Foden', 'Kane', 'Rashford', 'Grealish', 'Mount', 'Gallagher', 'Palmer', 'Gordon', 'Trent'],
  },
  {
    code: 'CRO', name: 'Croácia', group: 'L',
    players: ['Livakovic', 'Gvardiol', 'Juranovic', 'Lovren', 'Sosa', 'Kovacic', 'Brozovic', 'Modric', 'Vlasic', 'Kramaric', 'Perisic', 'Sucic', 'Sutalo', 'Stanisic', 'Majer', 'Ivanusec', 'Budimir', 'Pasalic'],
  },
  {
    code: 'GHA', name: 'Gana', group: 'L',
    players: ['Ati-Zigi', 'Ofori', 'Lamptey', 'Salisu', 'Amartey', 'Mensah', 'Partey', 'Salis', 'Kudus', 'Ayew J', 'Ayew A', 'Williams', 'Sulemana', 'Kyereh', 'Arthur', 'Abdul Samed', 'Osman Bukari', 'Jordan Ayew'],
  },
  {
    code: 'PAN', name: 'Panamá', group: 'L',
    players: ['Penedo', 'Mejia', 'Murillo', 'Davis', 'Escobar', 'Walder', 'Parris', 'Quintero', 'Godoy', 'Anderson', 'Fajardo', 'Tejada', 'Brown', 'Carrasquilla', 'Galvan', 'Adames', 'Torres J', 'Rodriguez J'],
  },
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
  { id: 'SP-011', name: 'Estádio AT&T - Dallas', type: 'stadium' as const, rarity: 'common' as const },
  { id: 'SP-012', name: 'Estádio SoFi - Los Angeles', type: 'stadium' as const, rarity: 'common' as const },
  { id: 'SP-013', name: 'Estádio Hard Rock - Miami', type: 'stadium' as const, rarity: 'common' as const },
  { id: 'SP-014', name: 'Estádio Levi\'s - São Francisco', type: 'stadium' as const, rarity: 'common' as const },
  { id: 'SP-015', name: 'Best Goal WC 2026', type: 'special' as const, rarity: 'holographic' as const },
  { id: 'SP-016', name: 'Fair Play Award 2026', type: 'special' as const, rarity: 'foil' as const },
  { id: 'SP-017', name: 'Opening Ceremony 2026', type: 'special' as const, rarity: 'foil' as const },
  { id: 'SP-018', name: 'Final WC 2026', type: 'special' as const, rarity: 'holographic' as const },
  { id: 'SP-019', name: 'Panini Collection Logo', type: 'logo' as const, rarity: 'foil' as const },
  { id: 'SP-020', name: 'WC 2026 Countdown', type: 'special' as const, rarity: 'common' as const },
];

export async function seedStickers(): Promise<void> {
  const countRow = await queryOne<{ c: string }>('SELECT COUNT(*) as c FROM stickers');
  const count = parseInt(countRow?.c ?? '0', 10);
  const expected = TEAMS.length * 20 + SPECIAL_CARDS.length;
  if (count === expected) return;

  // Re-seed needed
  await execute('DELETE FROM user_stickers');
  await execute('DELETE FROM stickers');

  await transaction(async (client) => {
    let num = 1;

    for (const team of TEAMS) {
      // Badge card
      await client.query(
        `INSERT INTO stickers (id, number, team_code, team_name, group_name, player_name, card_type, rarity, image_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO NOTHING`,
        [`${team.code}-BADGE`, num++, team.code, team.name, team.group, null, 'badge', 'foil', `/img/badges/${team.code.toLowerCase()}.svg`]
      );

      // Team logo
      await client.query(
        `INSERT INTO stickers (id, number, team_code, team_name, group_name, player_name, card_type, rarity, image_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO NOTHING`,
        [`${team.code}-LOGO`, num++, team.code, team.name, team.group, null, 'logo', 'common', `/img/logos/${team.code.toLowerCase()}.svg`]
      );

      // Players
      for (let i = 0; i < team.players.length; i++) {
        const player = team.players[i];
        const rarity = i === 0 ? 'foil' : (i === team.players.length - 1 ? 'holographic' : 'common');
        await client.query(
          `INSERT INTO stickers (id, number, team_code, team_name, group_name, player_name, card_type, rarity, image_url)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO NOTHING`,
          [`${team.code}-P${String(i + 1).padStart(2, '0')}`, num++, team.code, team.name, team.group, player, 'player', rarity, `/img/players/${team.code.toLowerCase()}_${i + 1}.svg`]
        );
      }
    }

    // Special cards
    for (const sp of SPECIAL_CARDS) {
      await client.query(
        `INSERT INTO stickers (id, number, team_code, team_name, group_name, player_name, card_type, rarity, image_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO NOTHING`,
        [sp.id, num++, 'SPECIAL', 'Especial', 'ESPECIAL', sp.name, sp.type, sp.rarity, `/img/specials/${sp.id.toLowerCase()}.svg`]
      );
    }
  });

  console.log('Stickers seeded successfully');
}
