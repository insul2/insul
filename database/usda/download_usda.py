import urllib.request
import json
import time

API_KEY = "DEMO_KEY"
BASE_URL = "https://api.nal.usda.gov/fdc/v1"

SEARCH_QUERIES = [
    "rice", "beans", "bread", "apple", "banana", "chicken", "beef", 
    "milk", "cheese", "egg", "pasta", "potato", "oats", "yogurt", 
    "orange", "pizza", "chocolate", "coffee", "juice", "avocado"
]

def fetch_usda_foods():
    all_foods = []
    print("Iniciando extracao dos alimentos da API do USDA (FoodData Central)...")
    
    for query in SEARCH_QUERIES:
        url = f"{BASE_URL}/foods/search?api_key={API_KEY}&query={urllib.parse.quote(query)}&pageSize=25&dataType=Foundation%20Foods,SR%20Legacy"
        print(f"Pesquisando: {query}...")
        
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req) as response:
                data = json.loads(response.read().decode('utf-8'))
                foods = data.get('foods', [])
                
                for f in foods:
                    nutrients = {n['nutrientName']: n['value'] for n in f.get('foodNutrients', []) if 'nutrientName' in n}
                    
                    item = {
                        'fdcId': f.get('fdcId'),
                        'description': f.get('description'),
                        'dataType': f.get('dataType'),
                        'publicationDate': f.get('publicationDate'),
                        'carbohydrates_g': nutrients.get('Carbohydrate, by difference', 0.0),
                        'protein_g': nutrients.get('Protein', 0.0),
                        'fat_g': nutrients.get('Total lipid (fat)', 0.0),
                        'energy_kcal': nutrients.get('Energy', 0.0),
                        'fiber_g': nutrients.get('Fiber, total dietary', 0.0)
                    }
                    all_foods.append(item)
                    
            time.sleep(1.2)
            
        except Exception as e:
            print(f"Erro ao buscar '{query}': {e}")

    output_file = "database/usda/usda_foods_sample.json"
    with open(output_file, "w", encoding="utf-8") as out:
        json.dump(all_foods, out, ensure_ascii=False, indent=2)

    print(f"Download e estruturacao concluidos! {len(all_foods)} alimentos salvos em {output_file}.")

if __name__ == "__main__":
    fetch_usda_foods()
