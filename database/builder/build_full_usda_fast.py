import os
import csv

print("Iniciando indexacao completa dos 2 MILHOES de alimentos do USDA...")

OUTPUT_SEED_FILE = "database/seeds/002_seed_usda_full_foods.sql"
os.makedirs("database/seeds", exist_ok=True)

# 1. Carregar fdc_id -> description de todos os 2 milhões no food.csv
print("1. Carregando lista completa de alimentos (food.csv)...")
food_names = {}

food_path = "FoodData_Central_csv_2026-04-30/food.csv"
with open(food_path, "r", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        food_names[row.get("fdc_id")] = {
            "name": row.get("description"),
            "data_type": row.get("data_type", "USDA")
        }

print(f"   -> {len(food_names)} alimentos carregados na memoria.")

# 2. Ler food_nutrient.csv usando 'fdc_id' correto e buscar nutrient_id == '1005'
print("2. Lendo nutrientes e capturando carboidratos (food_nutrient.csv)...")
processed_foods = {}

def escape_sql(text):
    if text is None:
        return ""
    return str(text).replace("'", "''").replace("\\", "\\\\").strip()

nutrient_path = "FoodData_Central_csv_2026-04-30/food_nutrient.csv"
with open(nutrient_path, "r", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    count = 0
    for row in reader:
        count += 1
        if count % 2000000 == 0:
            print(f"   -> {count} linhas de nutrientes varridas...")
            
        # 1005 = Carbohydrate, by difference
        if row.get("nutrient_id") == "1005":
            fdc_id = row.get("fdc_id") # Coluna exata confirmada
            if fdc_id in food_names and fdc_id not in processed_foods:
                try:
                    carbs = float(row.get("amount", 0.0))
                    processed_foods[fdc_id] = carbs
                except ValueError:
                    pass

print(f"3. Escrevendo arquivo SQL Seed com {len(processed_foods)} alimentos com carboidratos...")

with open(OUTPUT_SEED_FILE, "w", encoding="utf-8") as out:
    out.write("-- Seed Completo USDA FoodData Central (2+ Milhoes de Alimentos)\n")
    out.write("INSERT INTO food_database (id, name, brand, portion_size_g, portion_description, carbs_per_portion, source, is_verified, is_active) VALUES\n")
    
    buffer = []
    total_written = 0
    for fdc_id, carbs in processed_foods.items():
        info = food_names[fdc_id]
        name_esc = escape_sql(info["name"])
        type_esc = escape_sql(info["data_type"])
        
        val_str = f"(UUID(), '{name_esc}', '{type_esc}', 100.0, '100g', {carbs}, 'USDA', TRUE, TRUE)"
        buffer.append(val_str)
        total_written += 1
        
        if len(buffer) >= 10000:
            out.write(",\n".join(buffer) + ",\n")
            buffer = []

    if buffer:
        out.write(",\n".join(buffer) + ";\n")

print(f"SUCESSO ABSOLUTO! {total_written} alimentos exportados para '{OUTPUT_SEED_FILE}'.")
