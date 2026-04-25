# Coach Copilot - FC Universitatea Cluj

O aplicație web interactivă pentru analiza performanțelor jucătorilor și echipelor din FC Universitatea Cluj, folosind date din Wyscout și antrenamente.

## Funcționalități

- **Lot Jucători**: Vizualizare jucători cu statistici și rating-uri
- **Raport Meci**: Analiza detaliată a meciurilor cu statistici jucător cu jucător
- **Progresie Sezon**: Grafice și tendințe de performanță pe parcursul sezonului
- **Statistici Fizice**: Date din antrenamente și monitorizare fizică
- **Degradare Cognitivă**: Analiza evenimentelor cognitive din meciuri

## Tehnologii Folosite

- HTML5, CSS3, JavaScript (ES6+)
- Chart.js pentru grafice
- Marked.js pentru parsing Markdown
- Date din JSON și Excel

## Instalare și Rulare

### Cerințe
- Python 3.x (pentru server local)
- Browser web modern

### Rulare Locală

1. Clonează repository-ul:
```bash
git clone <repository-url>
cd HackUCluj
```

2. Pornește serverul local:
```bash
python3 -m http.server 8000
```

3. Deschide în browser: `http://localhost:8000`

### Alternativ: Folosește script-ul de start

Pe macOS/Linux:
```bash
./start.sh
```

Pe Windows:
```cmd
start.bat
```

## Acces de pe Mobil

Aplicația este responsive și poate fi accesată de pe orice dispozitiv la adresa IP locală a computerului (ex: `http://192.168.1.100:8000`).

## Deploy în Cloud

### GitHub Pages (Recomandat pentru Hackathon)
1. Creează un repository nou pe GitHub
2. Încarcă toate fișierele proiectului (fără folderul `.git` dacă există)
3. Du-te la Settings > Pages
4. Selectează branch-ul `main` și folderul `/(root)`
5. Aplicația va fi disponibilă la `https://username.github.io/repository-name`

### Netlify
1. Conectează repository-ul GitHub la Netlify
2. Setează build settings: Build command: `echo "No build needed"` , Publish directory: `/`
3. Deploy automat la fiecare push

### Vercel
1. Conectează repository-ul GitHub la Vercel
2. Setează root directory: `/`
3. Deploy automat

## Structura Proiect

```
/
├── index.html          # Pagina principală
├── css/
│   └── style.css       # Stiluri CSS
├── js/
│   ├── main.js         # Logic principală
│   ├── ui.js           # Interfață utilizator
│   ├── data.js         # Gestionare date
│   ├── tabs.js         # Gestionare tab-uri
│   ├── chat.js         # Chat AI
│   ├── gemini.js       # Integrare Gemini AI
│   ├── gps_science.js  # Analize GPS
│   ├── physical.js     # Statistici fizice
│   └── utils.js        # Funcții utilitare
├── data/
│   ├── players.json
│   ├── players_stats.json
│   ├── matches_data.json
│   └── matches/         # Fișiere JSON pentru fiecare meci
├── start.sh            # Script start macOS/Linux
└── start.bat           # Script start Windows
```

## Date

Aplicația folosește date din:
- Wyscout API (statistici meciuri)
- Fișiere Excel din antrenamente
- Date manuale pentru echipă

## Dezvoltare

Pentru modificări, editează fișierele din `js/`, `css/` sau `index.html`.

## Licență

Proiect pentru HackUCluj 2026