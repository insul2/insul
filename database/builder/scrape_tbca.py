import os
import requests
from bs4 import BeautifulSoup
import json
import time

BASE_URL = "https://www.tbca.net.br/base-dados/"
START_URL = "https://www.tbca.net.br/base-dados/composicao_alimentos.php"

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

OUTPUT_FILE = "data/tbca_scraped_foods.json"
os.makedirs("data", exist_ok=True)

all_tbca_foods = []

def scrape_tbca_fast():
    print("=====================================================================")
    print("INICIANDO WEBSCRAPING RAPIDO E COMPLETO DA TBCA (USP / FoRC)")
    print("=====================================================================")

    page = 1
    total_pages = 60

    while page <= total_pages:
        page_url = f"{START_URL}?pagina={page}&atuald=1"
        print(f"Coletando Pagina {page}... ({page_url})")

        try:
            resp = requests.get(page_url, headers=headers, timeout=15)
            if resp.status_code != 200:
                print(f"Fim das paginas na pagina {page}.")
                break

            soup = BeautifulSoup(resp.text, 'html.parser')
            table = soup.find('table')
            if not table:
                print(f"Tabela nao encontrada na pagina {page}. Fim.")
                break

            rows = table.find_all('tr')[1:]
            if not rows:
                break

            print(f"   -> Encontrados {len(rows)} alimentos na pagina {page}.")

            for r in rows:
                cols = r.find_all('td')
                if len(cols) >= 4:
                    code = cols[0].text.strip()
                    name_a = cols[1].find('a')
                    name = name_a.text.strip() if name_a else cols[1].text.strip()
                    scientific_name = cols[2].text.strip()
                    group = cols[3].text.strip()
                    brand = cols[4].text.strip() if len(cols) >= 5 else ""

                    item = {
                        "code": code,
                        "name": name,
                        "scientific_name": scientific_name,
                        "group": group,
                        "brand": brand if brand else "TBCA / USP",
                        "portion_description": "100g",
                        "carbs_g": 0.0, # Pode ser atualizado se desejado
                        "source": "TBCA_USP",
                        "country": "BR"
                    }
                    all_tbca_foods.append(item)

            page += 1
            time.sleep(0.1)

        except Exception as e:
            print(f"Erro na pagina {page}: {e}")
            break

    with open(OUTPUT_FILE, "w", encoding="utf-8") as out:
        json.dump(all_tbca_foods, out, ensure_ascii=False, indent=2)

    print(f"\nWEBSCRAPING DA TBCA FINALIZADO COM SUCESSO!")
    print(f"Total de {len(all_tbca_foods)} alimentos raspados e salvos em '{OUTPUT_FILE}'.")

if __name__ == "__main__":
    scrape_tbca_fast()
