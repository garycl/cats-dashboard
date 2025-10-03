mkdir -p ~/.streamlit/

echo "\
[general]\n\
email = \"garylin@unison-ucg.com\"\n\
" > ~/.streamlit/credentials.toml

echo "[server]
headless = true
port = $PORT
enableCORS = false
[theme]
primaryColor=\"#F63366\"
backgroundColor=\"#FFFFFF\"
secondaryBackgroundColor=\"#F0F2F6\"
textColor=\"#262730\"
font=\"sans serif\"
" > ~/.streamlit/config.toml