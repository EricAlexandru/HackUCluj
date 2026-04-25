#!/bin/bash

# Script pentru pornirea serverului local Coach Copilot

echo "🚀 Pornind Coach Copilot - FC Universitatea Cluj..."
echo ""

# Verifică dacă Python 3 este instalat
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 nu este instalat. Te rog instalează Python 3."
    exit 1
fi

# Verifică dacă portul 8000 este liber
if lsof -i :8000 &> /dev/null; then
    echo "⚠️  Portul 8000 este deja în uz. Închid procesul existent..."
    kill $(lsof -t -i :8000) 2>/dev/null
    sleep 2
fi

echo "🌐 Serverul rulează la: http://localhost:8000"
echo "📱 Pentru acces de pe mobil: http://$(hostname -I | awk '{print $1}'):8000"
echo ""
echo "Apasă Ctrl+C pentru a opri serverul."

# Pornește serverul
python3 -m http.server 8000