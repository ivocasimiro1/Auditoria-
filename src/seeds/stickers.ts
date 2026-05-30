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
    players: ['Luis Malagón', 'Jesús Gallardo', 'Johan Vásquez', 'César Montes', 'Israel Reyes', 'Jorge Sánchez', 'Orbelín Pineda', 'Diego Lainez', 'Edson Álvarez', 'Érick Sánchez', 'Carlos Rodríguez', 'Marcel Ruiz', 'Raúl Jiménez', 'Santiago Giménez', 'Hirving Lozano', 'Alexis Vega', 'César Huerta', 'Roberto Alvarado'],
  },
  {
    code: 'RSA', name: 'África do Sul', group: 'A',
    players: ['Ronwen Williams', 'Sanukele Kabini', 'Sifiso Chaine', 'Siyabonga Ngezana', 'Khuliso Mudau', 'Thalente Mbatha', 'Sipho Mbule', 'Oswin Appollis', 'Mohau Nkota', 'Iqraam Rayners', 'Khulumani Ndamane'],
  },
  {
    code: 'KOR', name: 'Coreia do Sul', group: 'A',
    players: ['Seungyu Kim', 'Hyeonwoo Jo', 'Myungjae Lee', 'Leeul Kwon', 'Kangin Lee', 'Jens Castrop', 'Seungho Paik', 'Yumin Cho', 'Jaesung Lee', 'Hyeonghu Oh', 'Youngwoo Seol', 'Hanbeom Lee', 'Heechan Hwang'],
  },
  {
    code: 'CZE', name: 'Chéquia', group: 'A',
    players: ['Jindřich Staněk', 'Matej Kovář', 'Vladimír Coufal', 'Ladislav Krejčí', 'Tomáš Holeš', 'David Zima', 'Lukáš Provod', 'Lukáš Červ', 'Václav Černý', 'Pavel Šulc', 'Patrik Schick', 'Adam Hložek', 'Tomáš Chorý', 'Matej Vydra', 'Jaroslav Zelený', 'Michal Sadílek'],
  },

  // Group B
  {
    code: 'CAN', name: 'Canadá', group: 'B',
    players: ['Dayne St. Clair', 'Kamal Miller', 'Derek Cornelius', 'Sam Adekugbe', 'Moïse Bombito', 'Jonathan Osorio', 'Ismaël Koné', 'Stephen Eustáquio', 'Jonathan David', 'Tajon Buchanan', 'Cyle Larin', 'Alphonso Davies', 'Liam Millar', 'Mathieu Choinière'],
  },
  {
    code: 'BIH', name: 'Bósnia-Herzegovina', group: 'B',
    players: ['Nikola Vasilj', 'Amar Memić', 'Sead Kolašinac', 'Tarik Muharemović', 'Ivan Šunjić', 'Samed Baždar', 'Amir Hadžiahmetović', 'Benjamin Tahirović', 'Nhad Mujasić', 'Edin Džeko', 'Ivan Bašić', 'Haris Tabaković'],
  },
  {
    code: 'QAT', name: 'Qatar', group: 'B',
    players: ['Pedro Miguel', 'Lucas Mendes', 'Boualem Khoukhi', 'Hassan Al-Haydos', 'Karim Boudiaf', 'Assim Madibo', 'Ahmed Al-Ganhi', 'Abdelaziz Hatem', 'Sultan Albraike', 'Tarek Salman', 'Homam Ahmed', 'Mohammed Waad', 'Almoez Ali'],
  },
  {
    code: 'SUI', name: 'Suíça', group: 'B',
    players: ['Gregor Kobel', 'Manuel Akanji', 'Nico Elvedi', 'Aurèle Amenda', 'Silvan Widmer', 'Ricardo Rodríguez', 'Granit Xhaka', 'Remo Freuler', 'Fabian Rieder', 'Michel Aebischer', 'Denis Zakaria', 'Dan Ndoye', 'Rubén Vargas', 'Johan Manzambi', 'Zeki Amdouni'],
  },

  // Group C
  {
    code: 'BRA', name: 'Brasil', group: 'C',
    players: ['Alisson Becker', 'Bento', 'Danilo', 'Marquinhos', 'Éder Militão', 'Gabriel Magalhães', 'Casemiro', 'Bruno Guimarães', 'Lucas Paquetá', 'Wesley', 'Luiz Henrique', 'Vinícius Júnior', 'Rodrygo', 'Raphinha', 'Gabriel Martinelli', 'Matheus Cunha', 'João Pedro', 'Estêvão'],
  },
  {
    code: 'MAR', name: 'Marrocos', group: 'C',
    players: ['Yassine Bounou', 'Romain Saïss', 'Nayef Aguerd', 'Jawad El Yamiq', 'Adan Masina', 'Sofyan Amrabat', 'Imael Saibari', 'Bilal El Khannouss', 'Brahim Díaz', 'Eliesse Ben Seghir', 'Abe Ezzalzouli', 'Youssef En-Nesyri', 'Ayoub El Kaabi'],
  },
  {
    code: 'HAI', name: 'Haiti', group: 'C',
    players: ['Johny Placide', 'Duke Lacroix', 'Leverton Pierre', 'Danley Jean Jacques', 'Hamiès Delcroix', 'Jean-Roser Bellegarde', 'Christopher Attys', 'Martin Expérience', 'Carlens Arcus', 'Jean Kévin Duverné', 'Ricardo Adé', 'Loudius Deedson', 'Josué Casimir', 'Derrick Etienne Jr.', 'Duckens Nazon'],
  },
  {
    code: 'SCO', name: 'Escócia', group: 'C',
    players: ['Angus Gunn', 'Grant Hanley', 'Scott McKenna', 'John Souttar', 'Jack Hendry', 'Anthony Ralston', 'Scott McTominay', 'Lewis Ferguson', 'Kenny McLean', 'Ryan Christie', 'John McGinn', 'Lyndon Dykes'],
  },

  // Group D
  {
    code: 'USA', name: 'Estados Unidos', group: 'D',
    players: ['Matt Freese', 'Chris Richards', 'Mark McKenzie', 'Alex Freeman', 'Antonee Robinson', 'Tyler Adams', 'Tanner Tessmann', 'Weston McKennie', 'Cristian Roldán', 'Timothy Weah', 'Diego Luna', 'Malik Tillman', 'Christian Pulisic', 'Brenden Aaronson', 'Ricardo Pepi', 'Haji Wright', 'Folarin Balogun'],
  },
  {
    code: 'PAR', name: 'Paraguai', group: 'D',
    players: ['Roberto Fernández', 'Fabián Balbuena', 'Omar Alderete', 'Júnior Alonso', 'Juan José Cáceres', 'Gustavo Gómez', 'Andrés Cubas', 'Matías Villasanti', 'Diego Gómez', 'Miguel Almirón', 'Julio Enciso', 'Ángel Romero', 'Ramón Sosa', 'Orlando Gill'],
  },
  {
    code: 'AUS', name: 'Austrália', group: 'D',
    players: ['Mathew Ryan', 'Cameron Burgess', 'Milos Degenek', 'Harry Souttar', 'Alessandro Circati', 'Aziz Behich', 'Lewis Miller', 'Jackson Irvine', 'Aiden O\'Neill', 'Craig Goodwin', 'Kusini Yengi', 'Nestory Irankunda', 'Jordan Bos'],
  },
  {
    code: 'TUR', name: 'Turquia', group: 'D',
    players: ['Uğurcan Çakır', 'Merih Demiral', 'Abdülkerim Bardakcı', 'Çağlar Söyüncü', 'Ferdi Kadıoğlu', 'Zeki Çelik', 'Mert Müldür', 'Hakan Çalhanoğlu', 'İrfan Can Kahveci', 'Kaan Ayhan', 'Orkun Kökçü', 'Kerem Aktürkoğlu', 'Arda Güler', 'Barış Alper Yılmaz', 'Kenan Yıldız', 'Can Uzun', 'Yunus Akgün', 'İsmail Yüksek'],
  },

  // Group E
  {
    code: 'GER', name: 'Alemanha', group: 'E',
    players: ['Marc-André Ter Stegen', 'Jonathan Tah', 'Antonio Rüdiger', 'Nico Schlotterbeck', 'Maximilian Mittelstädt', 'Ridle Bakú', 'Joshua Kimmich', 'Leon Goretzka', 'Felix Nmecha', 'Florian Wirtz', 'Jamal Musiala', 'Serge Gnabry', 'Kai Havertz', 'Nick Woltemade'],
  },
  {
    code: 'CUW', name: 'Curaçao', group: 'E',
    players: ['Eloy Room', 'Armando Obispo', 'Joshua Brenet', 'Jurgen Locadia', 'Roshon Van Elima', 'Jurjen Gaari', 'Shuranov Sambo', 'Juninho Bacuna', 'Jeremy Antonisse', 'Kenji Gorré', 'Jearl Margaritha', 'Sontje Hansen', 'Sherel Floranus', 'Godfried Roemeratoe', 'Gevane Kastaneer'],
  },
  {
    code: 'CIV', name: 'Costa do Marfim', group: 'E',
    players: ['Yaha Fofana', 'Odilon Kossounou', 'Evan Ndicka', 'Ousmane Diomande', 'Emmanuel Agbadou', 'Ghislain Konan', 'Wilfried Singo', 'Seko Fofana', 'Yan Diomande', 'Max Alain Gradel', 'Simon Adingra', 'Amad Diallo', 'Sébastien Haller'],
  },
  {
    code: 'ECU', name: 'Equador', group: 'E',
    players: ['Hernán Galíndez', 'Piero Hincapié', 'William Pacho', 'Ángelo Preciado', 'Joel Ordóñez', 'Alan Franco', 'Pervis Estupiñán', 'Moisés Caicedo', 'Kendry Páez', 'John Yeboah', 'Gonzalo Valle', 'Nilson Angulo', 'Pedro Vite', 'Gonzalo Plata', 'Leonardo Campana', 'Kevin Rodríguez', 'Alan Minda', 'Enner Valencia'],
  },

  // Group F
  {
    code: 'NED', name: 'Países Baixos', group: 'F',
    players: ['Bart Verbruggen', 'Virgil Van Dijk', 'Micky Van De Ven', 'Jan-Paul Van Hecke', 'Nathan Aké', 'Jurriën Timber', 'Denzel Dumfries', 'Jeremie Frimpong', 'Frenkie De Jong', 'Teun Koopmeiners', 'Tijjani Reijnders', 'Ryan Gravenberch', 'Xavi Simons', 'Memphis Depay', 'Justin Kluivert', 'Donyell Malen', 'Cody Gakpo', 'Wout Weghorst'],
  },
  {
    code: 'JPN', name: 'Japão', group: 'F',
    players: ['Junnosuke Suzuki', 'Tsuyoshi Watanabe', 'Shogo Taniguchi', 'Ao Tanaka', 'Daichi Kamada', 'Takumi Minamino', 'Junya Ito', 'Takefusa Kubo', 'Kaoru Mitoma', 'Yuki Soma', 'Kota Ueda', 'Keito Nakamura', 'Shuto Machino'],
  },
  {
    code: 'SWE', name: 'Suécia', group: 'F',
    players: ['Viktor Johansson', 'Victor Nilsson Lindelöf', 'Isak Hien', 'Daniel Svensson', 'Gabriel Gudmundsson', 'Hugo Larsson', 'Jesper Karlström', 'Lucas Bergvall', 'Yasin Ayari', 'Ken Sema', 'Anthony Elanga', 'Roony Bardghji', 'Alexander Isak', 'Viktor Gyökeres'],
  },
  {
    code: 'TUN', name: 'Tunísia', group: 'F',
    players: ['Aymen Dahmen', 'Montassar Talbi', 'Yassine Meriah', 'Van Valery', 'Ali Abdi', 'Ferjani Sassi', 'Ellyes Skhiri', 'Aïssa Laïdouni', 'Hannibal Mejbri', 'Ismaël Gharbi', 'Hazem Mastouri', 'Naïm Sliti', 'Elias Saad', 'Sayfallah Ltaief', 'Elias Achouri'],
  },

  // Group G
  {
    code: 'BEL', name: 'Bélgica', group: 'G',
    players: ['Koen Casteels', 'Zeno Debast', 'Brandon Mechele', 'Arthur Theate', 'Maxim De Cuyper', 'Thomas Meunier', 'Timothy Castagne', 'Amadou Onana', 'Youri Tielemans', 'Kevin De Bruyne', 'Nicolas Raskin', 'Hans Vanaken', 'Alexis Saelemaekers', 'Jérémy Doku', 'Loïs Openda', 'Romelu Lukaku'],
  },
  {
    code: 'EGY', name: 'Egito', group: 'G',
    players: ['Mohamed Elshenawi', 'Ramy Rabia', 'Ahmed Fatouh', 'Khaled Sobhi', 'Mohamed Hamdy', 'Mohammad Abu Hashish', 'Mohanad Lasheen', 'Trezeguet', 'Omar Marmoush', 'Mohamed Salah'],
  },
  {
    code: 'IRN', name: 'Irão', group: 'G',
    players: ['Alireza Beiranvand', 'Morteza Pouraliganji', 'Milad Mohammadi', 'Shejae Khalilzadeh', 'Hossein Kanaani', 'Omid Noorafkan', 'Saeed Ezatolahi', 'Saman Ghoddos', 'Roozbeh Cheshmi', 'Alireza Jahanbakhsh', 'Saleh Hardani', 'Sardar Azmoun', 'Mehdi Taremi', 'Mohammad Mohebi'],
  },
  {
    code: 'NZL', name: 'Nova Zelândia', group: 'G',
    players: ['Max Crocombe', 'Alex Paulsen', 'Michael Boxall', 'Liberato Cacace', 'Tim Payne', 'Ryan Thomas', 'Matthew Garbett', 'Joe Bell', 'Callum McCowatt', 'Marko Stamenic', 'Francis De Vries', 'Elijah Barbarouses', 'Chris Wood', 'Finn Surman'],
  },

  // Group H
  {
    code: 'ESP', name: 'Espanha', group: 'H',
    players: ['Unai Simón', 'Aymeric Laporte', 'Robin Le Normand', 'Dean Huijsen', 'Dani Carvajal', 'Pedro Porro', 'Marc Cucurella', 'Martín Zubimendi', 'Rodri', 'Pedri', 'Fabián Ruiz', 'Mikel Merino', 'Lamine Yamal', 'Dani Olmo', 'Nico Williams', 'Ferran Torres', 'Álvaro Morata', 'Mikel Oyarzabal'],
  },
  {
    code: 'CMV', name: 'Cabo Verde', group: 'H',
    players: ['Vozinha', 'Logan Costa', 'Steven Moreira', 'Diney', 'Wagner Pina', 'Patrick Andrade', 'Pico', 'Gerry Duarte', 'Ryan Mendes', 'Yannick Semedo', 'Dilon Livramento', 'Jovane Cabral', 'Bebé', 'Willy Semedo', 'João Paulo'],
  },
  {
    code: 'SAU', name: 'Arábia Saudita', group: 'H',
    players: ['Mohammad Al-Owais', 'Saud Abdulhamid', 'Hassan Altambakti', 'Abdulrahman Alsanbi', 'Saleh Abu Alshamat', 'Abdulrahman Alobud', 'Marwan Alsahafi', 'Musab Aljuwayr', 'Abdullah Alkhaibari', 'Ziad Alkhani', 'Nasser Aldawsari', 'Salem Aldawsari', 'Jehad Thikri', 'Saleh Alshehri'],
  },
  {
    code: 'URU', name: 'Uruguai', group: 'H',
    players: ['Sergio Rochet', 'José María Giménez', 'Ronald Araújo', 'Sebastián Cáceres', 'Guillermo Varela', 'Mathías Olivera', 'Maxi Araújo', 'Rodrigo Bentancur', 'Federico Valverde', 'Nahitan Nández', 'Manuel Ugarte', 'Facundo Pellistri', 'Santiago Miele', 'Federico Viñas', 'Darwin Núñez'],
  },

  // Group I
  {
    code: 'FRA', name: 'França', group: 'I',
    players: ['Mike Maignan', 'William Saliba', 'Jules Koundé', 'Ibrahima Konaté', 'Dayot Upamecano', 'Théo Hernández', 'Lucas Digne', 'Aurélien Tchouaméni', 'Eduardo Camavinga', 'Manu Koné', 'Adrien Rabiot', 'Michaël Olise', 'Ousmane Dembélé', 'Bradley Barcola', 'Désiré Doué', 'Kingsley Coman', 'Hugo Ekitiké', 'Kylian Mbappé'],
  },
  {
    code: 'SEN', name: 'Senegal', group: 'I',
    players: ['Édouard Mendy', 'Kalidou Koulibaly', 'Moussa Niakhaté', 'Abdoulaye Seck', 'Ismaïl Jakobs', 'Idrissa Gana Gueye', 'Lamine Camara', 'Pape Gueve', 'Habib Diarra', 'Ismaïla Sarr', 'Krepin Diatta', 'Pape Matar Sarr', 'Nicolas Jackson', 'Boulaye Dia', 'Liman Ndiaye'],
  },
  {
    code: 'IRQ', name: 'Iraque', group: 'I',
    players: ['Jalal Hassan', 'Rebin Sulaka', 'Hussein Ali', 'Youssef Amyn', 'Akam Hashem', 'Ibrahim Bayesh', 'Osama Rashid', 'Zidane Iqbal', 'Zaid Tahseen', 'Ali Jasim', 'Mohanad Ali', 'Ammar Sheri', 'Ali Al-Hamadi', 'Mekhyas Doski', 'Manaf Younis'],
  },
  {
    code: 'NOR', name: 'Noruega', group: 'I',
    players: ['Ørjan Nyland', 'Kristoffer Vassbakk Ajer', 'Leo Østigård', 'Sander Berge', 'Morten Thorsby', 'Patrick Berg', 'Torbjørn Heggem', 'Martin Ødegaard', 'David Møller Wolfe', 'Aron Dønnum', 'Oscar Bobb', 'Jørgen Strand Larsen', 'Antonio Nusa', 'Erling Haaland'],
  },

  // Group J
  {
    code: 'ARG', name: 'Argentina', group: 'J',
    players: ['Emiliano Martínez', 'Nicolás Otamendi', 'Cristian Romero', 'Leonardo Balerdi', 'Nicolás Tagliafico', 'Nahuel Molina', 'Leandro Paredes', 'Rodrigo De Paul', 'Alexis Mac Allister', 'Enzo Fernández', 'Exequiel Palacios', 'Nico Paz', 'Nico González', 'Franco Mastantuono', 'Lionel Messi', 'Julián Álvarez', 'Lautaro Martínez', 'Giuliano Simeone'],
  },
  {
    code: 'ALG', name: 'Argélia', group: 'J',
    players: ['Ramy Bensebaini', 'Aïssa Mandi', 'Youcef Atal', 'Rayan Aït-Nouri', 'Ramiz Zerrouki', 'Ismaël Bennacer', 'Hicham Boudaoui', 'Houssem Aouar', 'Farès Chaïbi', 'Alexis Guendouz', 'Anis Hadj Moussa', 'Amine Gouiri', 'Riyad Mahrez', 'Said Benrahma', 'Baghdad Bounedjah'],
  },
  {
    code: 'AUT', name: 'Áustria', group: 'J',
    players: ['Patrick Pentz', 'Alexander Schlager', 'Stefan Posch', 'Philipp Lienhart', 'Kevin Danso', 'Philipp Mwene', 'Alexander Prass', 'David Alaba', 'Konrad Laimer', 'Xaver Schlager', 'Nicolas Seiwald', 'Marcel Sabitzer', 'Romano Schmid', 'Christoph Baumgartner', 'Patrick Wimmer', 'Michael Gregoritsch'],
  },
  {
    code: 'JOR', name: 'Jordânia', group: 'J',
    players: ['Ibrahim Saadeh', 'Bisan Haddad', 'Ibrahim Sabra', 'Mahmoud Al-Mardi', 'Anas Jamous', 'Noor Al-Rawabdeh', 'Ali Olwan', 'Mohammad Abu Zrayq', 'Mohammad Abu Taha', 'Yazan Al-Naimat', 'Yazeed Abulaila', 'Mousa Al-Taamari', 'Salem Obaid', 'Nizar Al-Rashdan', 'Mohammad Abualnadi'],
  },

  // Group K
  {
    code: 'POR', name: 'Portugal', group: 'K',
    players: ['Diogo Costa', 'José Sá', 'Rúben Dias', 'Gonçalo Inácio', 'Diogo Dalot', 'João Cancelo', 'Nuno Mendes', 'Rúben Neves', 'Bruno Fernandes', 'Vitinha', 'João Neves', 'Bernardo Silva', 'Cristiano Ronaldo', 'Francisco Trincão', 'João Félix', 'Gonçalo Ramos', 'Pedro Neto', 'Rafael Leão'],
  },
  {
    code: 'COD', name: 'Congo DR', group: 'K',
    players: ['Axel Tuanzebe', 'Chancel Mbemba', 'Arthur Masuaku', 'Joris Kayembe', 'Ngalivel Mukau', 'Charles Pickel', 'Brian Cipenga', 'Edo Kayembi', 'Fiston Mavele', 'Lionel Mpasi', 'Nathanaël Mbuku', 'Meschack Elia', 'Yoane Wissa', 'Aaron Wan-Bissaka', 'Cédric Bakambu'],
  },
  {
    code: 'UZB', name: 'Uzbequistão', group: 'K',
    players: ['Sherzod Nasrullaev', 'Rustam Ashurmatov', 'Khojanbar Alijonov', 'Umar Eshmurodov', 'Khojamat Erkinov', 'Farrukh Savfiev', 'Igor Sergeev', 'Jamshid Iskanderov', 'Abdobek Fayzullaev', 'Husnidon Alidulov', 'Jalolidon Masharipov', 'Azobek Turgonboev', 'Otabek Shukurov', 'Eldor Shomurodov', 'Oston Urunov'],
  },
  {
    code: 'COL', name: 'Colômbia', group: 'K',
    players: ['Camilo Vargas', 'David Ospina', 'Davinson Sánchez', 'Yerry Mina', 'Jhon Lucumí', 'Daniel Muñoz', 'Johan Mojica', 'Santiago Arias', 'Jefferson Lerma', 'Kevin Castaño', 'Richard Ríos', 'Juan Fernando Quintero', 'James Rodríguez', 'Luis Suárez', 'Jorge Carrascal', 'Jhon Arias', 'Jhon Córdoba', 'Luis Díaz'],
  },

  // Group L
  {
    code: 'ENG', name: 'Inglaterra', group: 'L',
    players: ['Jordan Pickford', 'John Stones', 'Marc Guéhi', 'Dan Burn', 'Reece James', 'Trent Alexander-Arnold', 'Declan Rice', 'Jordan Henderson', 'Jude Bellingham', 'Cole Palmer', 'Morgan Rogers', 'Anthony Gordon', 'Phil Foden', 'Bukayo Saka', 'Marcus Rashford', 'Harry Kane', 'Ollie Watkins'],
  },
  {
    code: 'CRO', name: 'Croácia', group: 'L',
    players: ['Dominik Livaković', 'Duje Ćaleta-Car', 'Joško Gvardiol', 'Luka Vušković', 'Franko Ivanović', 'Kristijan Jakić', 'Luka Modrić', 'Martin Baturina', 'Lovro Majer', 'Mario Pašalić', 'Andrej Kramarić', 'Ivan Perišić'],
  },
  {
    code: 'GHA', name: 'Gana', group: 'L',
    players: ['Joseph Wollacott', 'Mohammed Salisu', 'Alexander Djiku', 'Alidu Seidu', 'Tariq Lamptey', 'Caleb Yirenkyi', 'Salis Abdul Samed', 'Thomas Partey', 'Osman Bukari', 'Kamaldeen Sulemana', 'Abdul Issahaku Fatawu', 'Joseph Paintsil', 'Antoine Semenyo', 'Iñaki Williams'],
  },
  {
    code: 'PAN', name: 'Panamá', group: 'L',
    players: ['Luis Mejía', 'Fidel Escobar', 'Eric Davis', 'César Blackman', 'José Luis Rodríguez', 'Michael Amir Murillo', 'Carlos Harvey', 'Aníbal Godoy', 'Adalberto Carrasquilla', 'José Córdoba', 'Edgar Bárcenas', 'Alberto Quintero', 'Cristian Martínez', 'José Fajardo'],
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

const SEED_VERSION = 'v3-full-names';

export async function seedStickers(): Promise<void> {
  // Check if current data matches expected version (v4 = PDF names, variable player counts)
  const qatP01 = await queryOne<{ player_name: string }>(
    "SELECT player_name FROM stickers WHERE id = 'QAT-P01'"
  );
  const norLast = await queryOne<{ player_name: string }>(
    "SELECT player_name FROM stickers WHERE id = 'NOR-P14'"
  );
  const alreadyCurrent = qatP01?.player_name === 'Pedro Miguel' && norLast?.player_name === 'Erling Haaland';
  if (alreadyCurrent) return;

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
