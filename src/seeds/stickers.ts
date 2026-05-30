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
    players: ['Luis Malagón', 'Johan Vásquez', 'Jorge Sánchez', 'César Montes', 'Jesús Gallardo', 'Israel Reyes', 'Diego Lainez', 'Carlos Rodríguez', 'Edson Álvarez', 'Orbelín Pineda', 'Marcel Ruiz', 'Erick Sánchez', 'Hirving Lozano', 'Santiago Giménez', 'Raúl Jiménez', 'Alexis Vega', 'Roberto Alvarado', 'César Huerta'],
  },
  {
    code: 'RSA', name: 'África do Sul', group: 'A',
    players: ['Ronwen Williams', 'Sipho Chaine', 'Aubrey Modiba', 'Samukele Kabini', 'Mbekezeli Mbokazi', 'Siyabonga Ngezana', 'Khuliso Mudau', 'Nkosinathi Sibisi', 'Teboho Mokoena', 'Themba Zwane', 'Percy Tau', 'Bongokuhle Hlongwane', 'Lyle Foster', 'Evidence Makgopa', 'Elias Mokwana', 'Oswin Appollis', 'Morphing Letsholonyane', 'Khulumani Ndamane'],
  },
  {
    code: 'KOR', name: 'Coreia do Sul', group: 'A',
    players: ['Kim Seung-gyu', 'Jo Hyeon-woo', 'Kim Min-jae', 'Jung Seung-hyun', 'Lee Yong', 'Kim Jin-su', 'Hwang In-beom', 'Son Heung-min', 'Hwang Hee-chan', 'Kwon Chang-hoon', 'Cho Gue-sung', 'Oh Hyeon-gyu', 'Lee Kang-in', 'Jung Woo-young', 'Paik Seung-ho', 'Song Min-kyu', 'Jeong Sang-bin', 'Kim Young-gwon'],
  },
  {
    code: 'CZE', name: 'Chéquia', group: 'A',
    players: ['Jindřich Staněk', 'Matěj Kovář', 'Vladimír Coufal', 'Tomáš Souček', 'Jan Bořil', 'Pavel Kadeřábek', 'Ladislav Krejčí', 'Marek Penc', 'Lukáš Provod', 'Ondřej Lingr', 'Patrik Schick', 'Adam Hložek', 'Jan Kuchta', 'Mojmír Chytil', 'Tomáš Chorý', 'Matěj Jurásek', 'Aleš Mandous', 'David Jurásek'],
  },

  // Group B
  {
    code: 'CAN', name: 'Canadá', group: 'B',
    players: ['Milan Borjan', 'Maxime Crépeau', 'Kamal Miller', 'Alistair Johnston', 'Derek Cornelius', 'Sam Adekugbe', 'Jonathan Osorio', 'Stephen Eustáquio', 'Mark-Anthony Kaye', 'Richie Laryea', 'Jonathan David', 'Tajon Buchanan', 'Cyle Larin', 'Alphonso Davies', 'Junior Hoilett', 'Liam Millar', 'Jacob Shaffelburg', 'Théo Corbeanu'],
  },
  {
    code: 'BIH', name: 'Bósnia-Herzegovina', group: 'B',
    players: ['Nikola Vasilj', 'Kenan Pirić', 'Sanjin Prcić', 'Ermin Bičakčić', 'Anel Ahmedhodžić', 'Sead Kolašinac', 'Miralem Pjanić', 'Elvis Sarić', 'Edin Višća', 'Edin Džeko', 'Ermedin Demirović', 'Amer Gojak', 'Haris Hajradinović', 'Adnan Nanić', 'Benjamin Tahi rovič', 'Anel Džaka', 'Armin Hodžić', 'Lamine Balde'],
  },
  {
    code: 'QAT', name: 'Qatar', group: 'B',
    players: ['Al-Sheeb', 'Barsham', 'Pedro Miguel', 'Al-Rawi', 'Salman', 'Khoukhi', 'Hassan', 'Al-Haydos', 'Boudiaf', 'Muneer', 'Afif', 'Ali', 'Almoos', 'Al-Moez', 'Ismail', 'Waad', 'Homam', 'Asad'],
  },
  {
    code: 'SUI', name: 'Suíça', group: 'B',
    players: ['Yann Sommer', 'Gregor Kobel', 'Silvan Widmer', 'Manuel Akanji', 'Nico Elvedi', 'Ricardo Rodríguez', 'Remo Freuler', 'Granit Xhaka', 'Xherdan Shaqiri', 'Haris Seferović', 'Breel Embolo', 'Fabian Rieder', 'Dan Ndoye', 'Noah Okafor', 'Zeki Amdouni', 'Michel Aebischer', 'Vincent Sierro', 'Kwadwo Duah'],
  },

  // Group C
  {
    code: 'BRA', name: 'Brasil', group: 'C',
    players: ['Alisson', 'Bento', 'Marquinhos', 'Éder Militão', 'Gabriel Magalhães', 'Danilo', 'Wesley', 'Lucas Paquetá', 'Casemiro', 'Bruno Guimarães', 'Luiz Henrique', 'Vinicius Júnior', 'Rodrygo', 'João Pedro', 'Matheus Cunha', 'Gabriel Martinelli', 'Raphinha', 'Estêvão'],
  },
  {
    code: 'MAR', name: 'Marrocos', group: 'C',
    players: ['Yassine Bounou', 'Munir Mohamedi', 'Achraf Hakimi', 'Romain Saïss', 'Nayef Aguerd', 'Noussair Mazraoui', 'Sofyan Amrabat', 'Azzedine Ounahi', 'Hakim Ziyech', 'Youssef En-Nesyri', 'Sofiane Boufal', 'Walid Cheddira', 'Yahya Jabrane', 'Selim Amallah', 'Ilias Chair', 'Abdessamad Ezzalzouli', 'Bilal El Khannouss', 'Zakaria Aboukhlal'],
  },
  {
    code: 'HAI', name: 'Haiti', group: 'C',
    players: ['Voltaire', 'Placide', 'Rosefort', 'Pierre', 'Jean-Baptiste', 'Chery', 'Altidor', 'Thard', 'Herold', 'Jerome', 'Pierre-Louis', 'Antoine', 'Germain', 'Nazon', 'Duplessis', 'Thermitus', 'Casimir', 'Desrosiers'],
  },
  {
    code: 'SCO', name: 'Escócia', group: 'C',
    players: ['Craig Gordon', 'Angus Gunn', 'Aaron Hickey', 'Scott McKenna', 'Grant Hanley', 'Andrew Robertson', 'Callum McGregor', 'Billy Gilmour', 'John McGinn', 'Ryan Christie', 'Che Adams', 'Lyndon Dykes', 'Kenny McLean', 'Stuart Armstrong', 'Kieran Tierney', 'Nathan Patterson', 'James Forrest', 'Scott McTominay'],
  },

  // Group D
  {
    code: 'USA', name: 'Estados Unidos', group: 'D',
    players: ['Matt Freese', 'Chris Richards', 'Tim Ream', 'Mark McKenzie', 'Alex Freeman', 'Antonee Robinson', 'Tyler Adams', 'Tanner Tessmann', 'Weston McKennie', 'Christian Roldan', 'Timothy Weah', 'Diego Luna', 'Malik Tillman', 'Christian Pulisic', 'Brenden Aaronson', 'Ricardo Pepi', 'Haji Wright', 'Folarin Balogun'],
  },
  {
    code: 'PAR', name: 'Paraguai', group: 'D',
    players: ['Gastón Fernández', 'Antony Silva', 'Omar Alderete', 'Fabián Balbuena', 'Junior Alonso', 'Matías Rojas', 'Andrés Cubas', 'Mathías Villasanti', 'Tomás Almeida', 'Antonio Sanabria', 'Julio Enciso', 'Miguel Almirón', 'Bernardo Cáceres', 'Éver Banega', 'Ramón Sosa', 'Blas Riveros', 'Alejandro Romero Gamarra', 'Israel Dos Santos'],
  },
  {
    code: 'AUS', name: 'Austrália', group: 'D',
    players: ['Mathew Ryan', 'Danny Vukovic', 'Milos Degenek', 'Kye Rowles', 'Harry Souttar', 'Aziz Behich', 'Aaron Mooy', 'Jackson Irvine', 'Mathew Leckie', 'Riley McGree', 'Mitchell Duke', 'Ajdin Hrustić', 'Jordan Bos', 'Cameron Devlin', 'Garang Kuol', 'Brandon Borrello', 'Jason Cummings', 'Marco Tilio'],
  },
  {
    code: 'TUR', name: 'Turquia', group: 'D',
    players: ['Mert Gunok', 'Uğurcan Çakır', 'Zeki Çelik', 'Samet Akaydin', 'Merih Demiral', 'Ferdi Kadıoğlu', 'Salih Özcan', 'Hakan Çalhanoğlu', 'Kerem Aktürkoğlu', 'Arda Güler', 'Barış Alper Yılmaz', 'Cenk Tosun', 'Orkun Kökçü', 'Kaan Ayhan', 'Mert Müldür', 'İrfan Can Kahveci', 'Abdülkerim Bardakcı', 'Serdar Dursun'],
  },

  // Group E
  {
    code: 'GER', name: 'Alemanha', group: 'E',
    players: ['Marc-André ter Stegen', 'Jonathan Tah', 'David Raum', 'Nico Schlotterbeck', 'Antonio Rüdiger', 'Waldemar Anton', 'Ridle Baku', 'Maximilian Mittelstädt', 'Joshua Kimmich', 'Florian Wirtz', 'Felix Nmecha', 'Leon Goretzka', 'Jamal Musiala', 'Serge Gnabry', 'Kai Havertz', 'Leroy Sané', 'Karim Adeyemi', 'Nick Woltemade'],
  },
  {
    code: 'CUW', name: 'Curaçao', group: 'E',
    players: ['Eloy Room', 'Cuco Martina', 'Rangelo Janga', 'Gevaro Nepomuceno', 'Gilkeson Leonce', 'Quentin Thurlings', 'Steffan Peeters', 'Nigel Thomas', 'Leandro Bacuna', 'Jurickson Profar', 'Phendependency Korevaar', 'Regilio Doelwijt', 'Gideon van Wyk', 'Brandley Kuwas', 'Darryl Lachman', 'Vurnon Anita', 'Rajiv van La Parra', 'Kelvin Leerdam'],
  },
  {
    code: 'CIV', name: 'Costa do Marfim', group: 'E',
    players: ['Yahia Fofana', 'Badra Ali Sangaré', 'Wilfried Singo', 'Odilon Kossounou', 'Evan Ndicka', 'Ghislain Konan', 'Franck Kessié', 'Jean Michaël Seri', 'Wilfried Zaha', 'Nicolas Pépé', 'Sébastien Haller', 'Maxwel Cornet', 'Max Gradel', 'Willy Boly', 'Simon Adingra', 'Oumar Diakité', 'Steeve Yago', 'Oumar Gonzalez'],
  },
  {
    code: 'ECU', name: 'Equador', group: 'E',
    players: ['Hernán Galíndez', 'Alexander Domínguez', 'Ángelo Preciado', 'Piero Hincapié', 'William Pacho', 'Pervis Estupiñán', 'Moisés Caicedo', 'Carlos Gruezo', 'Jeremy Sarmiento', 'Gonzalo Plata', 'Enner Valencia', 'Romario Ibarra', 'Kevin Rodríguez', 'Alan Minda', 'Jhegson Méndez', 'John Yeboah', 'Kendry Páez', 'Byron Castillo'],
  },

  // Group F
  {
    code: 'NED', name: 'Países Baixos', group: 'F',
    players: ['Bart Verbruggen', 'Mark Flekken', 'Denzel Dumfries', 'Stefan de Vrij', 'Virgil van Dijk', 'Nathan Aké', 'Frenkie de Jong', 'Teun Koopmeiners', 'Jeremie Frimpong', 'Xavi Simons', 'Memphis Depay', 'Cody Gakpo', 'Tijjani Reijnders', 'Mats Wieffer', 'Donyell Malen', 'Ryan Gravenberch', 'Brian Brobbey', 'Wout Weghorst'],
  },
  {
    code: 'JPN', name: 'Japão', group: 'F',
    players: ['Shuichi Gonda', 'Zion Suzuki', 'Hiroki Sakai', 'Ko Itakura', 'Maya Yoshida', 'Yuto Nagatomo', 'Wataru Endo', 'Hidemasa Morita', 'Daichi Kamada', 'Ritsu Doan', 'Takumi Minamino', 'Ayase Ueda', 'Takefusa Kubo', 'Kaoru Mitoma', 'Ao Tanaka', 'Daizen Maeda', 'Kyogo Furuhashi', 'Takuma Asano'],
  },
  {
    code: 'SWE', name: 'Suécia', group: 'F',
    players: ['Robin Olsen', 'Karl-Johan Johnsson', 'Emil Krafth', 'Victor Lindelöf', 'Pontus Jansson', 'Ludwig Augustinsson', 'Mattias Svanberg', 'Albin Ekdal', 'Emil Forsberg', 'Alexander Isak', 'Viktor Gyökeres', 'Dejan Kulusevski', 'Anthony Elanga', 'Jesper Karlsson', 'Samuel Dahl', 'Kristoffer Olsson', 'Oscar Willmar', 'John Guidetti'],
  },
  {
    code: 'TUN', name: 'Tunísia', group: 'F',
    players: ['Aymen Dahmen', 'Mouez Hassen', 'Montassar Talbi', 'Dylan Bronn', 'Yassine Meriah', 'Ali Maaloul', 'Anis Ben Slimane', 'Hannibal Mejbri', 'Ellyes Skhiri', 'Wahbi Khazri', 'Naïm Sliti', 'Issam Jebali', 'Sayfallah Ltaief', 'Mohamed Drager', 'Ferjani Sassi', 'Taha Yassine Khenissi', 'Maher Hannachi', 'Seifeddine Jaziri'],
  },

  // Group G
  {
    code: 'BEL', name: 'Bélgica', group: 'G',
    players: ['Koen Casteels', 'Simon Mignolet', 'Timothy Castagne', 'Jan Vertonghen', 'Wout Faes', 'Arthur Theate', 'Axel Witsel', 'Youri Tielemans', 'Kevin De Bruyne', 'Romelu Lukaku', 'Jeremy Doku', 'Amadou Onana', 'Charles De Ketelaere', 'Loïs Openda', 'Johan Bakayoko', 'Leandro Trossard', 'Arthur Vermeeren', 'Thomas Meunier'],
  },
  {
    code: 'EGY', name: 'Egito', group: 'G',
    players: ['Mohamed El-Shenawy', 'Ahmed Gabaski', 'Akram Tawfik', 'Ahmed Hegazy', 'Omar Kamal', 'Ahmed Fatouh', 'Mohamed Elneny', 'Amr El-Sulaya', 'Mahmoud Trezeguet', 'Mohamed Salah', 'Omar Marmoush', 'Mostafa Mohamed', 'Hamdi Fathi', 'Zizo', 'Ahmed Sayed Zizou', 'Taher Mohamed Taher', 'Emam Ashour', 'Ramadan Sobhi'],
  },
  {
    code: 'IRN', name: 'Irão', group: 'G',
    players: ['Alireza Beiranvand', 'Hossein Hosseini', 'Milad Mohammadi', 'Morteza Pouraliganji', 'Ehsan Hajsafi', 'Sadegh Moharrami', 'Saeid Ezatolahi', 'Ali Noorollahi', 'Alireza Jahanbakhsh', 'Ahmad Noorollahi', 'Mehdi Taremi', 'Sardar Azmoun', 'Karim Ansarifard', 'Ali Gholizadeh', 'Vahid Amiri', 'Roozbeh Cheshmi', 'Omid Alishah', 'Dariush Hosseini'],
  },
  {
    code: 'NZL', name: 'Nova Zelândia', group: 'G',
    players: ['Sail', 'Elliot', 'Thomas', 'Cacace', 'Just', 'Waine', 'McGlinchey', 'Bell', 'Barbarouses', 'Wood', 'Boxall', 'Garbett', 'Coveny', 'Sutton', 'Singh', 'Old', 'Paasi', 'Lea'],
  },

  // Group H
  {
    code: 'ESP', name: 'Espanha', group: 'H',
    players: ['Unai Simón', 'Robin Le Normand', 'Aymeric Laporte', 'Dean Huijsen', 'Pedro Porro', 'Dani Carvajal', 'Marc Cucurella', 'Martín Zubimendi', 'Rodri', 'Pedri', 'Fabián Ruiz', 'Mikel Merino', 'Lamine Yamal', 'Dani Olmo', 'Nico Williams', 'Ferran Torres', 'Álvaro Morata', 'Mikel Oyarzabal'],
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
    players: ['Sergio Rochet', 'Fernando Muslera', 'Mathías Olivera', 'José María Giménez', 'Ronald Araújo', 'Nahitan Nández', 'Federico Valverde', 'Rodrigo Bentancur', 'Giorgian De Arrascaeta', 'Edinson Cavani', 'Darwin Núñez', 'Facundo Pellistri', 'Manuel Ugarte', 'Facundo Torres', 'Maximiliano Gómez', 'Matías Vecino', 'Agustín Canobbio', 'Gastón Pereiro'],
  },

  // Group I
  {
    code: 'FRA', name: 'França', group: 'I',
    players: ['Mike Maignan', 'Theo Hernandez', 'William Saliba', 'Jules Koundé', 'Ibrahima Konaté', 'Dayot Upamecano', 'Lucas Digne', 'Aurélien Tchouaméni', 'Eduardo Camavinga', 'Manu Koné', 'Adrien Rabiot', 'Michael Olise', 'Ousmane Dembélé', 'Bradley Barcola', 'Désiré Doué', 'Kingsley Coman', 'Hugo Ekitike', 'Kylian Mbappé'],
  },
  {
    code: 'SEN', name: 'Senegal', group: 'I',
    players: ['Édouard Mendy', 'Seny Dieng', 'Bouna Sarr', 'Kalidou Koulibaly', 'Abdou Diallo', 'Fodé Ballo-Touré', 'Idrissa Gueye', 'Cheikhou Kouyaté', 'Ismaïla Sarr', 'Sadio Mané', 'Krepin Diatta', 'Boulaye Dia', 'Famara Diédhiou', 'Pape Matar Sarr', 'Lamine Camara', 'Habib Diallo', 'Nicolas Jackson', 'Iliman Ndiaye'],
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
    players: ['Emiliano Martínez', 'Nahuel Molina', 'Cristian Romero', 'Nicolás Otamendi', 'Nicolás Tagliafico', 'Leonardo Balerdi', 'Enzo Fernández', 'Alexis Mac Allister', 'Rodrigo De Paul', 'Exequiel Palacios', 'Leandro Paredes', 'Nico Paz', 'Franco Mastantuono', 'Nicolás González', 'Lionel Messi', 'Lautaro Martínez', 'Julián Álvarez', 'Giuliano Simeone'],
  },
  {
    code: 'ALG', name: 'Argélia', group: 'J',
    players: ['Raïs M\'Bolhi', 'Alexandre Oukidja', 'Youcef Atal', 'Aïssa Mandi', 'Djamel Benlamri', 'Ramy Bensebaïni', 'Ismaël Bennacer', 'Mattéo Guendouzi', 'Riyad Mahrez', 'Islam Slimani', 'Yacine Brahimi', 'Baghdad Bounedjah', 'Ramiz Zerrouki', 'Mohamed Amoura', 'Haris Belkebla', 'Andy Delort', 'Saïd Benrahma', 'Houssem Aouar'],
  },
  {
    code: 'AUT', name: 'Áustria', group: 'J',
    players: ['Patrick Pentz', 'Alexander Schlager', 'Stefan Posch', 'Philipp Lienhart', 'Maximilian Wöber', 'David Alaba', 'Florian Grillitsch', 'Konrad Laimer', 'Marcel Sabitzer', 'Christoph Baumgartner', 'Marko Arnautović', 'Michael Gregoritsch', 'Kevin Danso', 'Nicolas Seiwald', 'Xaver Schlager', 'Romano Schmid', 'Florian Kainz', 'Patrick Wimmer'],
  },
  {
    code: 'JOR', name: 'Jordânia', group: 'J',
    players: ['Shafi', 'Hasan', 'Al-Bawab', 'Khrisat', 'Al Rawabdeh', 'Hassan Abdel-Fattah', 'Musa', 'Al-Tamari', 'Baha Faisal', 'Yazan Al-Naimat', 'Ahmad Burhan', 'Ibrahim Saif', 'Sedki', 'Al-Zoubi', 'Al-Dardour', 'Musa Al-Taamari', 'Murad', 'Farwaz'],
  },

  // Group K
  {
    code: 'POR', name: 'Portugal', group: 'K',
    players: ['Diogo Costa', 'José Sá', 'Rúben Dias', 'João Cancelo', 'Diogo Dalot', 'Nuno Mendes', 'Gonçalo Inácio', 'Bernardo Silva', 'Bruno Fernandes', 'Rúben Neves', 'Vitinha', 'João Neves', 'Cristiano Ronaldo', 'Francisco Trincão', 'João Félix', 'Gonçalo Ramos', 'Pedro Neto', 'Rafael Leão'],
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
    players: ['Camilo Vargas', 'David Ospina', 'Santiago Arias', 'Dávinson Sánchez', 'Oscar Murillo', 'Johan Mojica', 'Jefferson Lerma', 'Wilmar Barrios', 'James Rodríguez', 'Juan Cuadrado', 'Luis Díaz', 'Rafael Santos Borré', 'Jorge Carrascal', 'Jhon Córdoba', 'Lucho Sinisterra', 'Luis Muriel', 'Jhon Arias', 'Richard Ríos'],
  },

  // Group L
  {
    code: 'ENG', name: 'Inglaterra', group: 'L',
    players: ['Jordan Pickford', 'John Stones', 'Marc Guéhi', 'Ezri Konsa', 'Trent Alexander-Arnold', 'Reece James', 'Dan Burn', 'Jordan Henderson', 'Declan Rice', 'Jude Bellingham', 'Cole Palmer', 'Morgan Rogers', 'Anthony Gordon', 'Phil Foden', 'Bukayo Saka', 'Harry Kane', 'Marcus Rashford', 'Ollie Watkins'],
  },
  {
    code: 'CRO', name: 'Croácia', group: 'L',
    players: ['Dominik Livaković', 'Ivo Grbić', 'Josip Juranović', 'Dejan Lovren', 'Joško Gvardiol', 'Borna Sosa', 'Mateo Kovačić', 'Marcelo Brozović', 'Luka Modrić', 'Nikola Vlašić', 'Andrej Kramarić', 'Ivan Perišić', 'Luka Sučić', 'Ivo Šutalo', 'Lovro Majer', 'Luka Ivanušec', 'Ante Budimir', 'Mario Pašalić'],
  },
  {
    code: 'GHA', name: 'Gana', group: 'L',
    players: ['Lawrence Ati-Zigi', 'Richard Ofori', 'Tariq Lamptey', 'Mohammed Salisu', 'Daniel Amartey', 'Jonathan Mensah', 'Thomas Partey', 'Elisha Owusu', 'Mohammed Kudus', 'Jordan Ayew', 'André Ayew', 'Kamaldeen Sulemana', 'Daniel-Kofi Kyereh', 'Antoine Semenyo', 'Inaki Williams', 'Abdul Samed', 'Osman Bukari', 'Ernest Nuamah'],
  },
  {
    code: 'PAN', name: 'Panamá', group: 'L',
    players: ['Jaime Penedo', 'Orlando Mosquera', 'César Yanis', 'Harold Cummings', 'Erick Davis', 'Fidel Escobar', 'Adalberto Carrasquilla', 'Rolando Blackburn', 'Édgar Bárcenas', 'Ismael Díaz', 'José Fajardo', 'Cecilio Waterman', 'Alfredo Stephens', 'Alberto Quintero', 'Arnaldo Mosquera', 'Éric Davis', 'Andrés Andrade', 'Iván Anderson'],
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
  const countRow = await queryOne<{ c: string }>('SELECT COUNT(*) as c FROM stickers');
  const count = parseInt(countRow?.c ?? '0', 10);
  const expected = TEAMS.length * 20 + SPECIAL_CARDS.length;

  // Check if current data matches expected version
  const mexGk = await queryOne<{ player_name: string }>(
    "SELECT player_name FROM stickers WHERE id = 'MEX-P01'"
  );
  // Check a player from the v3 update to detect if reseed is needed
  const belGk = await queryOne<{ player_name: string }>(
    "SELECT player_name FROM stickers WHERE id = 'BEL-P01'"
  );
  const alreadyCurrent = count === expected && mexGk?.player_name === 'Luis Malagón' && belGk?.player_name === 'Koen Casteels';
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
