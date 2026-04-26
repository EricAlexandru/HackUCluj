#!/bin/bash

# Script pentru pornirea serverului local Coach Copilot

echo "🚀 Pornind Coach Copilot - FC Universitatea Cluj..."
echo ""

# Verifică dacă Python 3 este instalat
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 nu este instalat. Te rog instalează Python 3."
    exit 1
fi

# Verifică dacă portul 8080 este liber
if lsof -i :8080 &> /dev/null; then
    echo "⚠️  Portul 8080 este deja în uz. Închid procesul existent..."
    kill $(lsof -t -i :8080) 2>/dev/null
    sleep 2
fi

echo "🌐 Serverul rulează la: http://localhost:8080"
local_ip=$(ifconfig | grep 'inet ' | grep -v 127.0.0.1 | head -1 | awk '{print $2}')
if [ -n "$local_ip" ]; then
    echo "📱 Pentru acces de pe mobil: http://$local_ip:8080"
else
    echo "📱 Pentru acces de pe mobil, verifică adresa IP locală și folosește http://<IP>:8080"
fi

echo ""
echo "Apasă Ctrl+C pentru a opri serverul."

# Pornește serverul pe toate interfețele
python3 -m http.server 8080 --bind 0.0.0.0