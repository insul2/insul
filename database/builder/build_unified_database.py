import os
import csv
import re

OUTPUT_SEED_FILE = "database/seeds/001_seed_food_database.sql"
os.makedirs("database/seeds", exist_ok=True)

foods = []
seen_names = set()

def escape_sql(text):
    if text is None:
        return ""
    return str(text).replace("'", "''").replace("\\", "\\\\").strip()

print("1. Processando dados do TACO (Tabela Brasileira UNICAMP)...")
taco_path = "docs/manual-contagem-carboidratos/README.md"
if os.path.exists(taco_path):
    with open(taco_path, "r", encoding="utf-8") as f:
        for line in f:
            if line.startswith("|") and "---" not in line and "Alimento" not in line:
                parts = [p.strip() for p in line.split("|")[1:-1]]
                if len(parts) >= 4:
                    name = parts[0]
                    portion = parts[1] if len(parts) > 1 else "100g"
                    try:
                        carbs_str = parts[3].replace(",", ".")
                        carbs = float(re.findall(r"\d+\.?\d*", carbs_str)[0])
                    except Exception:
                        carbs = 0.0
                        
                    if name and name.lower() not in seen_names and carbs >= 0:
                        seen_names.add(name.lower())
                        foods.append({
                            "name": name,
                            "brand": "TACO / UNICAMP",
                            "portion_size_g": 100.0,
                            "portion_description": portion,
                            "carbs_g": carbs,
                            "source": "TACO"
                        })

print(f"   -> {len(foods)} alimentos do TACO carregados.")

print("\n2. Processando dados do USDA (FoodData Central CSV)...")
usda_food_path = "FoodData_Central_csv_2026-04-30/food.csv"
usda_nutrient_path = "FoodData_Central_csv_2026-04-30/food_nutrient.csv"

carbs_by_fdc = {}

if os.path.exists(usda_nutrient_path):
    print("   -> Lendo nutrientes do USDA CSV...")
    with open(usda_nutrient_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        count = 0
        for row in reader:
            if row.get("nutrient_id") == "1005":
                fdc_id = row.get("food_fdc_id")
                try:
                    carbs_by_fdc[fdc_id] = float(row.get("amount", 0.0))
                except ValueError:
                    pass
                count += 1
                if count >= 300000:
                    break

if os.path.exists(usda_food_path):
    print("   -> Lendo lista de alimentos do USDA...")
    with open(usda_food_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        usda_added = 0
        for row in reader:
            fdc_id = row.get("fdc_id")
            name = row.get("description")
            
            if fdc_id in carbs_by_fdc and name and name.lower() not in seen_names:
                seen_names.add(name.lower())
                carbs = carbs_by_fdc[fdc_id]
                foods.append({
                    "name": name,
                    "brand": "USDA FoodData Central",
                    "portion_size_g": 100.0,
                    "portion_description": "100g",
                    "carbs_g": carbs,
                    "source": "USDA"
                })
                usda_added += 1
                if usda_added >= 5000:
                    break

print(f"   -> Total acumulado unificado: {len(foods)} alimentos.")

print("\n3. Gerando arquivo SQL Seed (001_seed_food_database.sql)...")
with open(OUTPUT_SEED_FILE, "w", encoding="utf-8") as out:
    out.write("-- Seed Unificado de Alimentos (TACO + USDA FoodData Central)\n")
    out.write(f"-- Total de itens: {len(foods)}\n\n")
    out.write("INSERT INTO food_database (id, name, brand, portion_size_g, portion_description, carbs_per_portion, source, is_verified, is_active) VALUES\n")
    
    values_arr = []
    for f in foods:
        name_esc = escape_sql(f["name"])
        brand_esc = escape_sql(f["brand"])
        desc_esc = escape_sql(f["portion_description"])
        val_str = f"(UUID(), '{name_esc}', '{brand_esc}', {f['portion_size_g']}, '{desc_esc}', {f['carbs_g']}, '{f['source']}', TRUE, TRUE)"
        values_arr.append(val_str)
        
    out.write(",\n".join(values_arr) + ";\n")

print(f"SUCESSO! Seed gerado com {len(foods)} alimentos unificados em '{OUTPUT_SEED_FILE}'.")
